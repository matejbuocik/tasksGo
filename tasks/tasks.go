package tasks

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type Task struct {
	Id   int       `json:"id"`
	Text string    `json:"text"`
	Tags []string  `json:"tags"`
	Due  time.Time `json:"due"`
	Done bool      `json:"done"`
}

type Tasker interface {
	CreateTask(newTask *Task) (*Task, error)
	DeleteTask(id int) error
	GetAllTasks() ([]Task, error)
	GetByDone(done bool) ([]Task, error)
	UpdateTask(id int, updateTask *Task) error
	GetByTags(tags []string) ([]Task, error)
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
		due		INTEGER NOT NULL,
		done    INTEGER NOT NULL
	);`)
	return t, err
}

func (t taskRepo) CreateTask(newTask *Task) (*Task, error) {
	res, err := t.db.Exec(`insert into task(text, tags, due, done) values (?, ?, ?, ?)`,
		newTask.Text, strings.Join(newTask.Tags, ","), newTask.Due.Unix(), newTask.Done)
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
	_, err := t.db.Exec(`update task set text=?, tags=?, due=?, done=? where id=?`,
		updateTask.Text, strings.Join(updateTask.Tags, ","), updateTask.Due.Unix(), updateTask.Done, id)
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

	tasks, err := t.getTasksFromRows(rows)
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (t taskRepo) GetByDone(done bool) ([]Task, error) {
	rows, err := t.db.Query("select * from task where done=? order by due asc", done)
	if err != nil {
		return nil, err
	}

	tasks, err := t.getTasksFromRows(rows)
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (t taskRepo) GetByTags(tags []string) ([]Task, error) {
	var sb strings.Builder
	sb.WriteString("select * from task where ")
	anyTags := make([]any, len(tags))
	for i, tag := range tags {
		anyTags[i] = fmt.Sprintf("%%%s%%", tag)
		sb.WriteString("tags like ?")
		if i < len(tags)-1 {
			sb.WriteString(" or ")
		}
	}
	sb.WriteString(" order by due asc")

	rows, err := t.db.Query(sb.String(), anyTags...)
	if err != nil {
		return nil, err
	}

	tasks, err := t.getTasksFromRows(rows)
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (t taskRepo) getTasksFromRows(rows *sql.Rows) ([]Task, error) {
	tasks := make([]Task, 0)

	for rows.Next() {
		task := Task{}
		var tags string
		var due int64

		if err := rows.Scan(&task.Id, &task.Text, &tags, &due, &task.Done); err != nil {
			return nil, err
		}

		if tags == "" {
			task.Tags = make([]string, 0)
		} else {
			task.Tags = strings.Split(tags, ",")
		}
		task.Due = time.Unix(due, 0).UTC()

		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}
