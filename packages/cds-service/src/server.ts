import dotenv from 'dotenv'
dotenv.config()
console.dir(process.env)

import app from './app'

process.on('SIGINT', function () {
  console.log('Exiting...')
  process.exit()
})

app({ logger: true }).then((s) => {
  s.listen(
    { port: Number.parseInt(process.env.PORT ?? '9001'), host: '0.0.0.0' },
    (error, address: string) => {
      if (error) {
        console.error(error)
        process.exit(1)
      }

      console.info(`Server started...${address}`)
    }
  )
})
