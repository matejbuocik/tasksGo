package middleware

import (
	"log"
	"net/http"
	"runtime/debug"
	"slices"
	"strings"
	"time"

	"github.com/matejbuocik/tasksGo/users"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		start := time.Now()
		lrw := NewLoggingResponseWriter(w)
		next.ServeHTTP(lrw, req)
		log.Printf("->%s %s | %s %d<-", req.Method, req.RequestURI, time.Since(start), lrw.statusCode)
	})
}

func PanicRecovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				log.Println(string(debug.Stack()))
			}
		}()
		next.ServeHTTP(w, req)
	})
}

func BasicAuth(next http.Handler, u users.Userer) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		user, pass, ok := req.BasicAuth()
		if ok {
			if usr := u.VerifyUserPass(user, pass); usr != nil {
				newctx := u.NewContext(req.Context(), usr)
				next.ServeHTTP(w, req.WithContext(newctx))
				return
			}
		}
		w.Header().Set("WWW-Authenticate", `Basic realm="api"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}

var originAllowlist = []string{
	"http://localhost:4173",
	"http://localhost:5173",
}

var methodAllowlist = []string{"GET", "POST", "DELETE", "OPTIONS"}
var headerAllowlist = []string{"Authorization", "Content-Type"}

func CheckCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		method := r.Header.Get("Access-Control-Request-Method")
		if slices.Contains(originAllowlist, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Headers", strings.Join(headerAllowlist, ", "))
			w.Header().Add("Vary", "Origin")
			if isPreflight(r) && slices.Contains(methodAllowlist, method) {
				w.Header().Set("Access-Control-Allow-Methods", strings.Join(methodAllowlist, ", "))
			}
		}
		next.ServeHTTP(w, r)
	})
}

func isPreflight(r *http.Request) bool {
	return r.Method == "OPTIONS" &&
		r.Header.Get("Origin") != "" &&
		r.Header.Get("Access-Control-Request-Method") != ""
}
