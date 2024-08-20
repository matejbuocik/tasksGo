package tasks

import (
	"database/sql"
	"strings"
	"time"
)

type Task struct {
	Id   int       `json:"id"`
	Text string    `json:"text"`
	Tags []string  `json:"tags"`
	Due  time.Time `json:"due"`
}

type Tasker interface {
	CreateTask(newTask *Task) (*Task, error)
	DeleteTask(id int) error
	GetAllTasks() ([]Task, error)
	UpdateTask(id int, updateTask *Task) error
}

type taskRepo struct {
	db *sql.DB
}

func NewTasker(db *sql.DB) (Tasker, error) {
	t := taskRepo{db}
	_, err := t.db.Exec(`
		CREATE TABLE IF NOT EXISTS task (
		id   	INTEGER PRIMARY KEY,
		text 	TEXT NOT NULL,
		tags 	TEXT NOT NULL,
		due		INTEGER NOT NULL
	);`)
	return t, err
}

func (t taskRepo) CreateTask(newTask *Task) (*Task, error) {
	res, err := t.db.Exec(`insert into task(text, tags, due) values (?, ?, ?)`,
		newTask.Text, strings.Join(newTask.Tags, ","), newTask.Due.Unix())
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	newTask.Id = int(id)
	return newTask, nil
}

func (t taskRepo) UpdateTask(id int, updateTask *Task) error {
	_, err := t.db.Exec(`update task set text=?, tags=?, due=? where id=?`,
		updateTask.Text, strings.Join(updateTask.Tags, ","), updateTask.Due.Unix(), id)
	if err != nil {
		return err
	}
	return nil
}

func (t taskRepo) DeleteTask(id int) error {
	_, err := t.db.Exec(`delete from task where id = ?`, id)
	return err
}

func (t taskRepo) GetAllTasks() ([]Task, error) {
	rows, err := t.db.Query("select * from task order by due asc")
	if err != nil {
		return nil, err
	}

	tasks := make([]Task, 0)

	for rows.Next() {
		task := Task{}
		var tags string
		var due int64

		if err := rows.Scan(&task.Id, &task.Text, &tags, &due); err != nil {
			return nil, err
		}

		task.Tags = strings.Split(tags, ",")
		task.Due = time.Unix(due, 0).UTC()

		tasks = append(tasks, task)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}
