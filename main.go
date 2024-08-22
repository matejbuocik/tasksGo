package main

import (
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"mime"
	"net/http"
	"strconv"
	"strings"

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

func main() {
	db, err := sql.Open("sqlite3", "./db.sq3")
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

	mux.Handle("DELETE /task/{id}", middleware.BasicAuth(http.HandlerFunc(server.deleteTaskHandler), server.users))
	mux.Handle("PUT /task/{id}", middleware.BasicAuth(http.HandlerFunc(server.editTaskHandler), server.users))
	mux.HandleFunc("OPTIONS /task/{id}", func(w http.ResponseWriter, r *http.Request) {})
	mux.Handle("POST /task", middleware.BasicAuth(http.HandlerFunc(server.createTaskHandler), server.users))
	mux.HandleFunc("OPTIONS /task", func(w http.ResponseWriter, r *http.Request) {})

	mux.Handle("POST /register", middleware.BasicAuth(http.HandlerFunc(server.registerHandler), server.users))
	// mux.HandleFunc("POST /register", server.registerHandler)

	mux.Handle("/", http.FileServer(http.Dir("./static")))

	handler := middleware.Logging(mux)
	handler = middleware.CheckCORS(handler)
	handler = middleware.PanicRecovery(handler)

	addr := flag.String("addr", "localhost:8080", "HTTPS network address")
	certFile := flag.String("certfile", "cert.pem", "certificate PEM file")
	keyFile := flag.String("keyfile", "key.pem", "key PEM file")
	flag.Parse()
	srv := &http.Server{
		Addr:    *addr,
		Handler: handler,
		TLSConfig: &tls.Config{
			MinVersion:               tls.VersionTLS13,
			PreferServerCipherSuites: true,
		},
	}
	log.Printf("Starting server on %s", *addr)
	log.Fatal(srv.ListenAndServeTLS(*certFile, *keyFile))
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
