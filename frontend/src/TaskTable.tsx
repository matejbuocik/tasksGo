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
        <div>
          {(props.getValue() as string[]).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
        </div>
      );
    },
    filterFn: 'arrIncludes',
  },
  {
    accessorKey: "due",
    cell: props => {
      const date = new Date((props.getValue() as string));
      if (date.getUTCFullYear() == 1) {
        return "";
      } else {
        return date.toDateString();
      }
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
    }
  },
  {
    id: "remove",
    cell: ({ row }) => {
      const task = row.original;
      return (
        <div className="w-4">
          <RemoveTaskDialog task={task} />
        </div>
      )
    }
  }
]

export default function TaskTable() {
  // pridat days remaining, priorita, cele to upravit
  // ked ostava najeaky cas (nastaveny), poslat mail
  // pripojenie s google kalendarom??
  // farba tasku / podla tagu
  // upozornenie na zostavajuce dni (ikonka co meni farbu)

  const getTasks = async () => {
    const res = await fetch('https://localhost:8080/task');
    if (res.ok) {
      return res.json() as Promise<Task[]>;
    }
    throw new Error("Something went wrong");
  }
  const { data, error, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });

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
    <div className="w-full">
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