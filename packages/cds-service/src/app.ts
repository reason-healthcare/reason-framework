import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from 'fastify'

export default (options?: FastifyServerOptions): FastifyInstance => {
  const app = fastify(options)

  app.get(
    '/PlanDefinition/$apply',
    async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      res.send({ message: 'Hello' })
    }
  )
  return app
}
