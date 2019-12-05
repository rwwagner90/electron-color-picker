import { resolve } from 'path'
import { execSync } from 'child_process'

import { getScriptFileListFromPathList } from '@dr-js/dev/module/node/file'
import { runMain, argvFlag } from '@dr-js/dev/module/main'
import { initOutput, packOutput, publishOutput } from '@dr-js/dev/module/output'
import { processFileList, fileProcessorBabel } from '@dr-js/dev/module/fileProcessor'
import { getTerserOption, minifyFileListWithTerser } from '@dr-js/dev/module/minify'

const PATH_ROOT = resolve(__dirname, '..')
const PATH_OUTPUT = resolve(__dirname, '../output-gitignore')
const fromRoot = (...args) => resolve(PATH_ROOT, ...args)
const fromOutput = (...args) => resolve(PATH_OUTPUT, ...args)
const execOptionRoot = { cwd: fromRoot(), stdio: argvFlag('quiet') ? [ 'ignore', 'ignore', 'inherit' ] : 'inherit', shell: true }

runMain(async (logger) => {
  const { padLog, log } = logger

  const packageJSON = await initOutput({ fromRoot, fromOutput, logger })

  padLog('generate export info')
  execSync(`npm run script-generate-spec`, execOptionRoot)

  if (!argvFlag('pack')) return
  if (process.platform === 'win32') throw new Error('use a *nix platform to pack `.tgz` to preserve correct file permission!')

  padLog(`build output`)
  execSync('npm run build-library', execOptionRoot)

  const fileList = await getScriptFileListFromPathList([ 'library' ], fromOutput)

  log(`process output`)
  await minifyFileListWithTerser({ fileList, option: getTerserOption(), rootPath: PATH_OUTPUT, logger })
  await processFileList({ fileList, processor: fileProcessorBabel, rootPath: PATH_OUTPUT, logger })

  const pathPackagePack = await packOutput({ fromRoot, fromOutput, logger })
  await publishOutput({ flagList: process.argv, packageJSON, pathPackagePack, extraArgs: [ '--userconfig', '~/mockingbot.npmrc' ], logger })
})
