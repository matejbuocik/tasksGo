import { z } from "zod";

export interface Task {
    id: number;
    text: string;
    tags: string[];
    due: string;
    done: boolean;
}

export interface TaskCreate {
    text: string;
    tags: string[];
    due?: Date | string;
    done?: boolean;
}

export const getTodoTasks = async () => {
    const res = await fetch('https://localhost:8080/todo');
    if (res.ok) {
        return res.json() as Promise<Task[]>;
    }
    throw new Error("Something went wrong");
}

export const getDoneTasks = async () => {
    const res = await fetch('https://localhost:8080/done');
    if (res.ok) {
        return res.json() as Promise<Task[]>;
    }
    throw new Error("Something went wrong");
}

export const getAllTasks = async () => {
    const res = await fetch('https://localhost:8080/task');
    if (res.ok) {
        return res.json() as Promise<Task[]>;
    }
    throw new Error("Something went wrong");
}

export const removeTask = async (id: number) => {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin' + ":" + 'adminkooo'));
    const res = await fetch(`https://localhost:8080/task/${id}`, { method: 'DELETE', headers });
    if (!res.ok) {
        throw new Error("Something went wrong");
    }
}

export const createTaskSchema = z.object({
    text: z.string().min(1, { message: 'Task should have at least 1 letter.' }),
    due: z.date().optional(),
    tags: z.array(
        z.object({
            tag: z.string().min(1, { message: 'Tag should not be empty.' }),
        }),
    ),
});

export const createTask = async (task: TaskCreate) => {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin' + ":" + 'adminkooo'));
    headers.set('Content-Type', 'application/json');
    const res = await fetch(`https://localhost:8080/task`, { method: 'POST', headers, body: JSON.stringify(task) });
    if (!res.ok) {
        throw new Error("Something went wrong");
    }
}

export const editTask = async ({ id, task }: { id: number, task: TaskCreate }) => {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin' + ":" + 'adminkooo'));
    headers.set('Content-Type', 'application/json');
    const res = await fetch(`https://localhost:8080/task/${id}`, { method: 'PUT', headers, body: JSON.stringify(task) });
    if (!res.ok) {
        throw new Error("Something went wrong");
    }
}
