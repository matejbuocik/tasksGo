import { animated, useSpring } from "@react-spring/web"
import TaskTable from "./TaskTable";
import CreateTaskDialog from "./CreateTaskDialog";
import { Toaster } from "@/components/ui/toaster";
import LoginDialog from "./LoginDialog";
import { useMutation } from "@tanstack/react-query";
import { logout } from "./login";
import { useCookies } from "react-cookie";

function App() {
  // TODO Dockerfile build, servovat z go servera + nginx
  // TODO Deploy + CI/CD (Google cloud?)
  const springsHeading = useSpring({
    from: { opacity: 0, fontSize: "0rem" },
    to: { opacity: 1, fontSize: "5rem" },
  })
  const springs = useSpring({
    config: { duration: 500 },
    from: { opacity: 0 },
    to: { opacity: 1 },
  })

  const [cookie] = useCookies(["session_token"])
  const mutation = useMutation({
    mutationFn: logout,
  })

  return (
    <main className="m-auto flex flex-col items-center">
      <animated.h1 className="m-0 pb-8 text-center" style={{ ...springsHeading }} onClick={() => mutation.mutate()}>
        TasksGo!
      </animated.h1>
      <animated.div style={{ ...springs }} className="flex flex-col items-center max-w-screen-xl w-full">
        {cookie.session_token ? <CreateTaskDialog /> : <LoginDialog />}
        <TaskTable />
      </animated.div>
      <Toaster />
    </main>
  )
}

export default App
