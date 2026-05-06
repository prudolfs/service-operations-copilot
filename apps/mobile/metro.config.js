const { getDefaultConfig } = require('expo/metro-config')
const { withNativewind } = require('nativewind/metro')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot)

// Bun workspaces hoist deps to the root node_modules. Watch the whole repo so
// edits to packages/{shared,convex} hot-reload, and resolve from both folders.
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

module.exports = withNativewind(config, {
  inlineVariables: false,
  // Polyfills `className` prop on every RN core component so we can write
  // `<View className="...">` directly. seniory disabled this and routed through
  // a `@/tw` wrapper instead — we choose direct usage for ergonomics.
  globalClassNamePolyfill: true,
})
