package users

import (
	"context"
	"database/sql"
	"errors"

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
	// NewContext returns a new Context that carries value usr.
	NewContext(ctx context.Context, usr *User) context.Context
	// FromContext returns the User value stored in ctx, if any.
	FromContext(ctx context.Context) (*User, bool)
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

type key int

var userKey key

func (u userRepo) NewContext(ctx context.Context, usr *User) context.Context {
	return context.WithValue(ctx, userKey, usr)
}

func (u userRepo) FromContext(ctx context.Context) (*User, bool) {
	usr, ok := ctx.Value(userKey).(*User)
	return usr, ok
}
