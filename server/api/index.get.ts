import { defineHandler } from 'nitro/h3'
import { version as nitroVersion } from 'nitro/meta'
import pkg from '~/package.json'

export default defineHandler(() => {
  return {
    name: pkg.name,
    version: pkg.version,
    nitroVersion,
  }
})
