package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/matejbuocik/tasksGo/middleware"
	"github.com/matejbuocik/tasksGo/tasks"
	"github.com/matejbuocik/tasksGo/users"
	"github.com/mattn/go-sqlite3"
)

var _ = sqlite3.SQLITE_OK

type TaskServer struct {
	tasks tasks.Tasker
	users users.Userer
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "OK")
}

var cookieMode = http.SameSiteStrictMode

func main() {
	dbFile := flag.String("dbfile", "./db.sq3", "sqlite database file")
	addr := flag.String("addr", "localhost:8080", "HTTP network address")
	// certFile := flag.String("certfile", "cert.pem", "certificate PEM file")
	// keyFile := flag.String("keyfile", "key.pem", "key PEM file")
	prod := flag.Bool("prod", true, "run server in production mode")
	flag.Parse()

	if !*prod {
		log.Print("Running in dev mode")
		cookieMode = http.SameSiteNoneMode
	} else {
		log.Print("Running in prod mode")
	}

	db, err := sql.Open("sqlite3", *dbFile)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	tasker, err := tasks.NewTasker(db)
	if err != nil {
		log.Fatal(err)
	}

	userer, err := users.NewUserer(db)
	if err != nil {
		log.Fatal(err)
	}

	server := TaskServer{tasker, userer}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /task", server.getAllTasksHandler)
	mux.HandleFunc("GET /todo", server.getTodoTasksHandler)
	mux.HandleFunc("GET /done", server.getDoneTasksHandler)

	mux.HandleFunc("OPTIONS /task/{id}", func(w http.ResponseWriter, r *http.Request) {})
	mux.HandleFunc("OPTIONS /task", func(w http.ResponseWriter, r *http.Request) {})
	mux.HandleFunc("OPTIONS /login", func(w http.ResponseWriter, r *http.Request) {})
	mux.HandleFunc("OPTIONS /logout", func(w http.ResponseWriter, r *http.Request) {})

	sessionAuth := func(next http.Handler) http.Handler { return middleware.SessionAuth(next, server.users, cookieMode) }
	mux.Handle("DELETE /task/{id}", sessionAuth(http.HandlerFunc(server.deleteTaskHandler)))
	mux.Handle("PUT /task/{id}", sessionAuth(http.HandlerFunc(server.editTaskHandler)))
	mux.Handle("POST /task", sessionAuth(http.HandlerFunc(server.createTaskHandler)))

	mux.Handle("POST /register", middleware.BasicAuth(http.HandlerFunc(server.registerHandler), server.users))
	mux.HandleFunc("POST /login", server.loginHandler)
	mux.HandleFunc("POST /logout", server.logoutHandler)

	mux.Handle("/", http.FileServer(http.Dir("./static")))

	handler := middleware.Logging(mux)
	if !*prod {
		handler = middleware.CheckCORS(handler)
	}
	handler = middleware.RealIP(handler)
	handler = middleware.PanicRecovery(handler)

	srv := &http.Server{
		Addr:    *addr,
		Handler: handler,
		// TLSConfig: &tls.Config{
		// 	MinVersion:               tls.VersionTLS13,
		// 	PreferServerCipherSuites: true,
		// },
	}
	log.Printf("Starting server on %s", *addr)
	// log.Fatal(srv.ListenAndServeTLS(*certFile, *keyFile))
	log.Fatal(srv.ListenAndServe())
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	log.Printf("Error: ->%s %s %s -- %s", r.RemoteAddr, r.Method, r.RequestURI, err)
	http.Error(w, "Oops! We made a mistake and are working on fixing it ASAP!", 500)
}

// RenderJSON renders 'v' as JSON and writes it as a response into w.
func renderJSON(w http.ResponseWriter, r *http.Request, v interface{}) {
	js, err := json.Marshal(v)
	if err != nil {
		handleError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}

// ParseJSON decodes json from request body into value pointed to by v.
// It sends error message when something unexpected happens.
func parseJSON(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	contentType := r.Header.Get("Content-Type")
	mediatype, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return false
	}
	if mediatype != "application/json" {
		http.Error(w, "expect application/json Content-Type", http.StatusUnsupportedMediaType)
		return false
	}

	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1_000_000))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

func (s TaskServer) createTaskHandler(w http.ResponseWriter, r *http.Request) {
	newTask := &tasks.Task{}
	if !parseJSON(w, r, newTask) {
		return
	}

	newTask, err := s.tasks.CreateTask(newTask)
	if err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(201)
	renderJSON(w, r, newTask)
}

func (s TaskServer) getAllTasksHandler(w http.ResponseWriter, r *http.Request) {
	tags := r.URL.Query()["tag"]
	if len(tags) > 0 {
		tasks, err := s.tasks.GetByTags(tags)
		if err != nil {
			handleError(w, r, err)
			return
		}
		renderJSON(w, r, tasks)
		return
	}

	allTasks, err := s.tasks.GetAllTasks()
	if err != nil {
		handleError(w, r, err)
		return
	}
	renderJSON(w, r, allTasks)
}

func (s TaskServer) getTodoTasksHandler(w http.ResponseWriter, r *http.Request) {
	tasks, err := s.tasks.GetByDone(false)
	if err != nil {
		handleError(w, r, err)
		return
	}
	renderJSON(w, r, tasks)
}

func (s TaskServer) getDoneTasksHandler(w http.ResponseWriter, r *http.Request) {
	tasks, err := s.tasks.GetByDone(true)
	if err != nil {
		handleError(w, r, err)
		return
	}
	renderJSON(w, r, tasks)
}

func (s TaskServer) deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	err = s.tasks.DeleteTask(id)
	if err != nil {
		handleError(w, r, err)
	}
}

func (s TaskServer) editTaskHandler(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	updateTask := &tasks.Task{}
	if !parseJSON(w, r, updateTask) {
		return
	}

	err = s.tasks.UpdateTask(id, updateTask)
	if err != nil {
		handleError(w, r, err)
	}
}

func (s TaskServer) registerHandler(w http.ResponseWriter, r *http.Request) {
	newUser := &users.User{}
	if !parseJSON(w, r, newUser) {
		return
	}

	if newUser.Pass == "" {
		http.Error(w, "Password cannot be empty", http.StatusBadRequest)
		return
	}

	err := s.users.Register(newUser.Name, newUser.Pass)
	if err != nil {
		if strings.Contains(err.Error(), "exists") {
			http.Error(w, "User with given name already exists.", http.StatusBadRequest)
		} else {
			handleError(w, r, err)
		}
	}
}

func (s TaskServer) loginHandler(w http.ResponseWriter, r *http.Request) {
	user := &users.User{}
	if !parseJSON(w, r, user) {
		return
	}

	session, ok := s.users.Login(user.Name, user.Pass)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    session.Token,
		Expires:  session.Expiry,
		SameSite: cookieMode,
		Secure:   true,
		Path:     "/",
	})
}

func (s TaskServer) logoutHandler(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("session_token")
	if err == nil && c != nil {
		s.users.Logout(c.Value)
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    "",
			Expires:  time.Unix(0, 0),
			SameSite: cookieMode,
			Secure:   true,
			Path:     "/",
		})
	}
}
