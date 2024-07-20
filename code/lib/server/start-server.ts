import http from "node:http"
// @ts-ignore
import frontend from "../../dist/index.html" with { type: "text" }
import type {
  AsyncProblemSolver,
  ProblemSolver,
} from "../solver-utils/ProblemSolver"
import { getScriptContent } from "./get-script-content"
import { getDatasetGenerator } from "../generators"
import type { AnySoupElement } from "@tscircuit/soup"

export const startServer = ({ solver }: { solver?: ProblemSolver } = {}) => {
  const server = http.createServer(async (req, res) => {
    let problemSoup: AnySoupElement[] | undefined
    let solutionSoup: AnySoupElement[] | undefined
    let userMessage: string | undefined

    if (req.url!.includes("/problem/")) {
      try {
        const [, , problemType, seedStr] = req.url!.split("/")
        const seed = seedStr ? Number.parseInt(seedStr) : 0
        problemSoup = await getDatasetGenerator(problemType as any).getExample({
          seed,
        })
      } catch (e: any) {
        userMessage = `Error generating problem: ${e.message}`
        console.error(userMessage)
      }
    }

    if (solver) {
      solutionSoup = await solver(problemSoup as AnySoupElement[])
    } else if (req.url!.includes("/problem/")) {
      const [, , problemType, seedStr] = req.url!.split("/")
      const seed = seedStr ? Number.parseInt(seedStr) : 0

      solutionSoup = await getDatasetGenerator(
        problemType as any
      ).getExampleWithTscircuitSolution({ seed: seed })
    }

    if (req.url!.includes(".json")) {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(solutionSoup, null, 2))
      return
    }

    res.writeHead(200, { "Content-Type": "text/html" })
    res.end(
      frontend.replace(
        "<!-- INJECT_SCRIPT -->",
        getScriptContent({ problemSoup, solutionSoup, userMessage })
      )
    )
  })

  server.listen(3000, () => {
    console.log("Server running on http://localhost:3000/")
  })

  return server
}

// const server = http.createServer((req, res) => {
//   res.writeHead(200, { 'Content-Type': 'text/plain' });
//   res.end('Hello World!');
// });

// server.listen(3000, () => {
//   console.log('Server running on http://localhost:3000/');
// });
