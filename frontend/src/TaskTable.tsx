import { useQuery } from "@tanstack/react-query";
import RemoveTaskDialog from "./RemoveTaskDialog";
import { ColumnDef } from "@tanstack/react-table";

export interface Task {
  id: number;
  text: string;
  tags: string[];
  due: string;
}

const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "text",
    header: "Task",
  },
  {
    accessorKey: "tags",
    header: "Tags",
  },
  {
    accessorKey: "due",
    header: "Due",
  },
]

export default function TaskTable() {
  const getTasks = async () => {
    const res = await fetch('https://localhost:8080/tag/todo');
    return res.json() as Promise<Task[]>;
  }
  const { data, error, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });

  if (isLoading || !data) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error.message}</p>
  }

  return (
    <table className="max-w-screen-xl w-full text-lg">
      <thead className="text-left">
        <tr>
          <th className="pl-2">Task</th>
          <th>Tags</th>
          <th>Due</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {data!.map(t =>
          <tr className="word-break even:bg-white odd:bg-slate-50 hover:bg-gray-200" key={t.id}>
            <td className="w-1/2 pl-2">{t.text}</td>
            <td>{t.tags.join(', ')}</td>
            <td>{new Date(t.due).getUTCFullYear() == 1 ? '': new Date(t.due).toDateString()}</td>
            <td className="w-0"><RemoveTaskDialog task={t} /></td>
          </tr>
        )}
      </tbody>
    </table>
  );
}