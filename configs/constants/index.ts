import { bootstrapBefore } from '../bootstrap'
import development, { EevRecord } from './development'
import staging from './staging'
import production from './production'
import local from './local'
import { ENVS } from './envs'


const parsedEnvs = bootstrapBefore()

const getCurrentEnv = (): ENVS => {
  const env = process.env?.NODE_ENV
  console.log(env)
  if (typeof env === 'undefined') {
    console.warn(`/n> ENV is not set, fallback to ${ENVS.DEVELOPMENT}.`)
  }
  const upperCaseEnv = `${env}`.toUpperCase()
  if (upperCaseEnv === ENVS.PRODUCTION) return ENVS.PRODUCTION
  if (upperCaseEnv === ENVS.STAGING) return ENVS.STAGING
  if (upperCaseEnv === ENVS.LOCAL) return ENVS.LOCAL
  return ENVS.DEVELOPMENT
}

const getCurrentConstants = (ident: ENVS): EevRecord => {
  let constants = development
  const source =
    ident === ENVS.PRODUCTION
      ? production
      : ident === ENVS.STAGING
        ? staging
        : ident === ENVS.LOCAL
          ? local : development
  Object.keys(development).forEach(key => {
    const sourceValue = source[key]
    const processValue = process.env[key]
    const parsedValue = parsedEnvs[key]

    if (typeof sourceValue !== 'undefined') {
      constants[key] = sourceValue
    }
    if (typeof processValue !== 'undefined') {
      constants[key] = processValue
    }
    if (typeof parsedValue !== 'undefined') {
      constants[key] = parsedValue
    }
  })

  constants.ENV_LABEL = source.ENV_LABEL ?? ""

  return constants
}

export const CURRENT_ENV = getCurrentEnv()

export const isProd = () => CURRENT_ENV === ENVS.PRODUCTION
const CONSTANTS = getCurrentConstants(CURRENT_ENV)

export default CONSTANTS
