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
	GetTasksByTag(tag string) ([]Task, error)
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
		task, err := getTaskFromRows(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}

func (t taskRepo) GetTasksByTag(tag string) ([]Task, error) {
	rows, err := t.db.Query("select * from task where instr(tags, ?) > 0 order by due asc", tag)
	if err != nil {
		return nil, err
	}

	tasks := make([]Task, 0)

	for rows.Next() {
		task, err := getTaskFromRows(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}

func getTaskFromRows(r *sql.Rows) (Task, error) {
	task := Task{}
	var tags string
	var due int64
	if err := r.Scan(&task.Id, &task.Text, &tags, &due); err != nil {
		return task, err
	}
	task.Tags = strings.Split(tags, ",")
	task.Due = time.Unix(due, 0).UTC()
	return task, nil
}
