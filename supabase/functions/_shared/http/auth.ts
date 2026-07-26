export function requireServiceRole(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  const apiKey = request.headers.get('apikey') ?? ''
  const opsKey = request.headers.get('x-ops-key') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const expectedOpsKey = Deno.env.get('OPS_SERVICE_ROLE_KEY')
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  const hasServiceRoleKey = Boolean(
    serviceRoleKey && (bearerToken === serviceRoleKey || apiKey === serviceRoleKey),
  )
  const hasOpsKey = Boolean(expectedOpsKey && opsKey === expectedOpsKey)

  if (!hasServiceRoleKey && !hasOpsKey) {
    throw new AuthError('Service role authorization is required', 401)
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message)
  }
}
