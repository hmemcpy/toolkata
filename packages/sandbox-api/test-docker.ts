import Docker from "dockerode"

const docker = new Docker({
  socketPath: process.env["DOCKER_HOST"] ?? "/var/run/docker.sock",
})

docker.getImage("toolkata-env:bash").inspect()
  .then(() => console.log("Image found!"))
  .catch((err) => console.error("Error:", err.message))
