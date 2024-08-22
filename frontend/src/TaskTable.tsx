import { useQuery } from "@tanstack/react-query";
import RemoveTaskDialog from "./RemoveTaskDialog";
import { ColumnDef, ColumnFiltersState, SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "./components/ui/badge";
import EditTaskDialog from "./EditTaskDialog";
import dayjs from "dayjs";
import { Switch } from "@/components/ui/switch";
import { Label } from "./components/ui/label";
import TaskDoneButton from "./TaskDoneButton";
import { Task, getDoneTasks, getTodoTasks } from "./task";

const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "text",
    header: "Task",
  },
  {
    accessorKey: "tags",
    header: ({ column }) => {
      const [open, setOpen] = useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="pl-[4px]">Tags</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filter by tag</DialogTitle>
              <DialogDescription />
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); setOpen(false) }} action="">
              <Input
                value={(column.getFilterValue() as string) ?? ""}
                onChange={event => column.setFilterValue(event.target.value)}
              />
            </form>
          </DialogContent>
        </Dialog>
      );
    },
    cell: props => {
      return (
        <div className="flex flex-col sm:flex-row justify-start gap-1">
          {(props.getValue() as string[]).map(t => <Badge key={t} variant="outline" className="font-normal">{t}</Badge>)}
        </div>
      );
    },
    filterFn: 'arrIncludes',
  },
  {
    accessorKey: "due",
    cell: props => {
      const date = dayjs(props.getValue() as string);
      if (date.year() == 1) {
        // task without date
        return "";
      }

      const today = dayjs();
      const dateString = date.toDate().toDateString();

      if (today.isAfter(date, 'day')) {
        return dateString;
      }

      if (today.isSame(date, 'day')) {
        return `${dateString} (today)`;
      }

      if (date.diff(today, 'day') === 0) {
        return `${dateString} (1 day remaining)`
      }

      return `${dateString} (${date.diff(today, 'day') + 1} days remaining)`;
    },
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="pl-[4px]"
          onClick={() => column.toggleSorting(!isSorted || isSorted === "asc")}
        >
          Due
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original;
      return (
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <TaskDoneButton task={task} />
          <EditTaskDialog task={task} />
          <RemoveTaskDialog task={task} />
        </div>
      )
    }
  }
]

export default function TaskTable() {
  // ked ostava najeaky cas (nastaveny), poslat mail
  // pripojenie s google kalendarom??
  // farba tasku / podla tagu, priorita

  const [doneTasksChecked, setDoneTasksChecked] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ['tasks', doneTasksChecked],
    queryFn: doneTasksChecked ? getDoneTasks : getTodoTasks
  });

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    columns,
    data: data ?? [],
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>
  }

  return (
    <div className="w-full pb-12 flex flex-col items-end">
      <div className="flex items-center gap-2">
        <Label htmlFor="all-tasks">Todo</Label>
        <Switch id="all-tasks" checked={doneTasksChecked} onCheckedChange={(c) => setDoneTasksChecked(c)} />
        <Label htmlFor="all-tasks">Done</Label>
      </div>

      <Table className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}