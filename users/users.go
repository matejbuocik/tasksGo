package users

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
	Pass string `json:"pass"`
}

type Userer interface {
	Register(name string, pass string) error
	VerifyUserPass(name string, pass string) *User
	Login(name string, pass string) (session *Session, ok bool)
	Logout(sessionToken string)
	CheckSession(sessionToken string) bool
}

type userRepo struct {
	db *sql.DB
}

func NewUserer(db *sql.DB) (Userer, error) {
	u := userRepo{db}
	_, err := u.db.Exec(`
		CREATE TABLE IF NOT EXISTS user (
		id   INTEGER PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		pass TEXT NOT NULL
	);`)
	return u, err
}

func (u userRepo) Register(name string, pass string) error {
	hashedPass, err := bcrypt.GenerateFromPassword([]byte(pass), 0)
	if err != nil {
		return err
	}
	_, err = u.db.Exec(`insert into user(name, pass) values (?, ?)`, name, hashedPass)
	if err != nil {
		if err, ok := err.(sqlite3.Error); ok && err.ExtendedCode == sqlite3.ErrConstraintUnique {
			return errors.New("User with given name already exists")
		}
		return err
	}

	return nil
}

var sessions = map[string]*Session{}

type Session struct {
	Token    string
	Username string
	Expiry   time.Time
}

func (u userRepo) CheckSession(sessionToken string) bool {
	session, exists := sessions[sessionToken]
	if !exists {
		return false
	}

	if session.Expiry.Before(time.Now()) {
		delete(sessions, sessionToken)
		return false
	}

	return true
}

func (u userRepo) Login(name string, pass string) (*Session, bool) {
	user := u.VerifyUserPass(name, pass)
	if user == nil {
		return nil, false
	}

	sessionToken := uuid.NewString()
	expiresAt := time.Now().Add(60 * time.Minute)
	session := &Session{
		Token:    sessionToken,
		Username: user.Name,
		Expiry:   expiresAt,
	}
	sessions[sessionToken] = session

	return session, true
}

func (u userRepo) Logout(sessionToken string) {
	delete(sessions, sessionToken)
}

func (u userRepo) VerifyUserPass(name string, pass string) *User {
	row := u.db.QueryRow(`select * from user where name = ?`, name)
	var user User
	if err := row.Scan(&user.Id, &user.Name, &user.Pass); err != nil {
		return nil
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Pass), []byte(pass)); err != nil {
		return nil
	}
	return &user
}
