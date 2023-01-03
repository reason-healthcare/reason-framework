import dotenv from 'dotenv'
import app from './app'

dotenv.config()

const server = app({ logger: { prettyPrint: true } }) // don't pretty print in prod
server.listen(process.env.PORT || 9001, '0.0.0.0', (error, address: string) => {
  if (error) {
    console.error(error)
    process.exit(1)
  }

  console.info(`Server started at ${address}`)
})
