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
		log.Printf("->%s %s %s <- %d %s", req.RemoteAddr, req.Method, req.RequestURI, lrw.statusCode, time.Since(start))
	})
}

func RealIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		realIP := r.Header.Get("X-Forwarded-For")
		if realIP != "" {
			r.RemoteAddr = realIP
		}
		next.ServeHTTP(w, r)
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
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if ok {
			if usr := u.VerifyUserPass(user, pass); usr != nil {
				next.ServeHTTP(w, r)
				return
			}
		}
		w.Header().Set("WWW-Authenticate", `Basic realm="api"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}

var originAllowlist = []string{
	"http://localhost:5173",
}

var methodAllowlist = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
var headerAllowlist = []string{"Authorization", "Content-Type"}

func CheckCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		method := r.Header.Get("Access-Control-Request-Method")
		if slices.Contains(originAllowlist, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Headers", strings.Join(headerAllowlist, ", "))
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			// Check for preflight request
			if r.Method == "OPTIONS" && origin != "" && slices.Contains(methodAllowlist, method) {
				w.Header().Set("Access-Control-Allow-Methods", strings.Join(methodAllowlist, ", "))
			}
		}
		next.ServeHTTP(w, r)
	})
}

func SessionAuth(next http.Handler, u users.Userer, cookieMode http.SameSite) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("session_token")
		if err != nil {
			if err == http.ErrNoCookie {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		if !u.CheckSession(c.Value) {
			http.SetCookie(w, &http.Cookie{
				Name:     "session_token",
				Value:    "",
				Expires:  time.Unix(0, 0),
				SameSite: cookieMode,
				Secure:   true,
				Path:     "/",
			})
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
