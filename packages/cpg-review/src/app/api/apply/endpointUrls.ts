const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

const configuredDockerHost = () =>
  process.env.CPG_REVIEW_DOCKER_HOST_INTERNAL?.trim()

export function toServerReachableEndpointUrl(
  endpointUrl: string,
  dockerHost = configuredDockerHost()
) {
  let parsed: URL

  try {
    parsed = new URL(endpointUrl)
  } catch {
    return endpointUrl
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !LOCAL_HOSTNAMES.has(parsed.hostname)
  ) {
    return endpointUrl
  }

  if (dockerHost) {
    parsed.hostname = dockerHost
    return parsed.toString()
  }

  if (parsed.hostname === 'localhost') {
    parsed.hostname = '127.0.0.1'
  }

  return parsed.toString()
}

export function toUserFacingEndpointText(
  message: string,
  dockerHost = configuredDockerHost()
) {
  if (!dockerHost) {
    return message
  }

  return message.replaceAll(dockerHost, 'localhost')
}
