import fs from 'node:fs/promises'
import path from 'node:path'

import matter from 'gray-matter'

import type { DefaultTheme } from 'vitepress'
import { defaultLLMsTxtTemplate } from '../constants'
import type { LinksExtension, LlmstxtSettings, PreparedFile, VitePressConfig } from '../types'
import { generateTOC } from './toc'
import { expandTemplate, extractTitle, generateMetadata } from './utils'

/**
 * Options for generating the `llms.txt` file.
 */
export interface GenerateLLMsTxtOptions {
	/** Path to the main documentation file `index.md`.*/
	indexMd: string

	/** The source directory for the files. */
	srcDir: VitePressConfig['vitepress']['srcDir']

	/** Template to use for generating `llms.txt`. */
	LLMsTxtTemplate?: LlmstxtSettings['customLLMsTxtTemplate']

	/** Template variables for `customLLMsTxtTemplate`. */
	templateVariables?: LlmstxtSettings['customTemplateVariables']

	/** The VitePress configuration. */
	vitepressConfig?: VitePressConfig['vitepress']['userConfig']

	/** The base domain for the generated links. */
	domain?: LlmstxtSettings['domain']

	/** The link extension for generated links. */
	linksExtension?: LinksExtension

	/** Whether to use clean URLs (without the extension). */
	cleanUrls?: VitePressConfig['cleanUrls']

	/** Optional sidebar configuration for organizing the TOC. */
	sidebar?: DefaultTheme.Sidebar
}

/**
 * Represents a directory with its files and navigation context
 */
export interface DirectoryChunk {
	/** Directory path relative to srcDir */
	dirPath: string
	/** Files in this directory and its subdirectories */
	files: PreparedFile[]
	/** Directory depth level */
	depth: number
	/** Parent directory path (empty string for root) */
	parentPath: string
	/** Sibling directory paths */
	siblingPaths: string[]
	/** Direct child directory paths */
	childPaths: string[]
}

/**
 * Options for generating navigation links between llms.txt files
 */
export interface NavigationOptions {
	/** Current directory path */
	currentDirPath: string
	/** Parent directory path */
	parentPath: string
	/** Sibling directory paths */
	siblingPaths: string[]
	/** Direct child directory paths */
	childPaths: string[]
	/** Base domain for links */
	domain?: string
	/** Source directory */
	srcDir: string
	/** Whether to use clean URLs */
	cleanUrls?: boolean
}

/**
 * Organizes files into directory chunks based on depth setting
 */
export function organizeFilesByDepth(
	preparedFiles: PreparedFile[],
	srcDir: string,
	depth: number,
	minFilesPerChunk: number,
): DirectoryChunk[] {
	const directoryMap = new Map<string, PreparedFile[]>()

	// Group files by directory
	for (const file of preparedFiles) {
		const relativePath = path.relative(srcDir, file.path)
		// Normalize path separators to forward slashes for consistent behavior
		const normalizedPath = relativePath.replace(/\\/g, '/')
		const dirParts = path.dirname(normalizedPath).split('/')

		// Generate directory paths for each depth level
		for (let d = 1; d <= Math.min(depth, dirParts.length + 1); d++) {
			const dirPath = d === 1 ? '' : dirParts.slice(0, d - 1).join('/')

			if (!directoryMap.has(dirPath)) {
				directoryMap.set(dirPath, [])
			}
			directoryMap.get(dirPath)!.push(file)
		}
	}

	// Filter out directories with insufficient files
	const validDirectories = Array.from(directoryMap.entries()).filter(([dirPath, files]) => {
		// Root directory always included if it has files
		if (dirPath === '') return files.length > 0
		// Other directories need minimum file count
		return files.length >= minFilesPerChunk
	})

	// Create directory chunks with navigation context
	const chunks: DirectoryChunk[] = []

	for (const [dirPath, files] of validDirectories) {
		const depthLevel = dirPath === '' ? 1 : dirPath.split('/').length + 1
		const parentPath = dirPath === '' ? '' : path.dirname(dirPath) === '.' ? '' : path.dirname(dirPath)

		// Find siblings (directories at same level with same parent)
		const siblingPaths = validDirectories
			.map(([p]) => p)
			.filter((p) => {
				if (p === dirPath) return false
				const pParent = p === '' ? '' : path.dirname(p) === '.' ? '' : path.dirname(p)
				const pDepth = p === '' ? 1 : p.split('/').length + 1
				return pParent === parentPath && pDepth === depthLevel
			})

		// Find direct children
		const childPaths = validDirectories
			.map(([p]) => p)
			.filter((p) => {
				if (p === '' || dirPath === '') return false
				const pParent = path.dirname(p) === '.' ? '' : path.dirname(p)
				return pParent === dirPath
			})

		chunks.push({
			dirPath,
			files,
			depth: depthLevel,
			parentPath,
			siblingPaths,
			childPaths,
		})
	}

	return chunks
}

/**
 * Generates navigation section for llms.txt files
 */
export function generateNavigationSection(options: NavigationOptions): string {
	const { currentDirPath, parentPath, siblingPaths, childPaths, domain, srcDir, cleanUrls } = options
	const links: string[] = []

	// Parent link
	if (parentPath !== currentDirPath && currentDirPath !== '') {
		const parentLlmsPath = parentPath === '' ? 'llms.txt' : `${parentPath}/llms.txt`
		const parentUrl = domain ? `${domain}/${parentLlmsPath}` : `/${parentLlmsPath}`
		const parentTitle =
			parentPath === ''
				? 'Documentation Overview'
				: path.basename(parentPath).charAt(0).toUpperCase() + path.basename(parentPath).slice(1)
		links.push(`- [${parentTitle}](${parentUrl}): Parent documentation section`)
	}

	// Sibling links
	for (const siblingPath of siblingPaths) {
		const siblingLlmsPath = `${siblingPath}/llms.txt`
		const siblingUrl = domain ? `${domain}/${siblingLlmsPath}` : `/${siblingLlmsPath}`
		const siblingTitle =
			path.basename(siblingPath).charAt(0).toUpperCase() + path.basename(siblingPath).slice(1)
		links.push(`- [${siblingTitle}](${siblingUrl}): ${siblingTitle} documentation`)
	}

	// Child links
	for (const childPath of childPaths) {
		const childLlmsPath = `${childPath}/llms.txt`
		const childUrl = domain ? `${domain}/${childLlmsPath}` : `/${childLlmsPath}`
		const childTitle = path.basename(childPath).charAt(0).toUpperCase() + path.basename(childPath).slice(1)
		links.push(`- [${childTitle}](${childUrl}): ${childTitle} documentation`)
	}

	return links.length > 0 ? links.join('\n') : ''
}

/**
 * Generates an llms.txt file for a specific directory chunk
 */
export async function generateDirectoryLLMsTxt(
	chunk: DirectoryChunk,
	options: Omit<GenerateLLMsTxtOptions, 'templateVariables'> & {
		templateVariables?: LlmstxtSettings['customTemplateVariables']
		includeNavigation?: boolean
	},
): Promise<string> {
	const { dirPath, files } = chunk
	const { srcDir, domain, includeNavigation = true } = options

	// For root directory, use the original generateLLMsTxt behavior
	if (dirPath === '') {
		return generateLLMsTxt(files, {
			...options,
			templateVariables: options.templateVariables || {},
		})
	}

	// Determine section title for subdirectories
	const sectionTitle = `${path.basename(dirPath).charAt(0).toUpperCase() + path.basename(dirPath).slice(1)} Documentation`

	// Generate navigation section
	let navigationSection = ''
	if (
		includeNavigation &&
		(chunk.parentPath !== chunk.dirPath || chunk.siblingPaths.length > 0 || chunk.childPaths.length > 0)
	) {
		const navLinks = generateNavigationSection({
			currentDirPath: dirPath,
			parentPath: chunk.parentPath,
			siblingPaths: chunk.siblingPaths,
			childPaths: chunk.childPaths,
			domain,
			srcDir,
			cleanUrls: options.cleanUrls,
		})

		if (navLinks) {
			navigationSection = `## Navigation\n\n${navLinks}\n\n`
		}
	}

	// Generate TOC for files in this directory
	const toc = await generateTOC(files, {
		srcDir,
		domain,
		sidebarConfig: options.sidebar,
		linksExtension: options.linksExtension,
		cleanUrls: options.cleanUrls,
	})

	// Prepare template variables
	const templateVariables = {
		title: sectionTitle,
		description: `> Documentation for the ${path.basename(dirPath)} section`,
		details: `Documentation and guides for ${path.basename(dirPath)}.`,
		navigation: navigationSection,
		toc,
		// Allow custom template variables to override defaults
		...options.templateVariables,
	}

	// Use custom template with navigation support
	const template =
		options.LLMsTxtTemplate ||
		`# {title}

{description}

{details}

{navigation}
## Documentation

{toc}`

	return expandTemplate(template, templateVariables)
}

/**
 * Generates a LLMs.txt file with a table of contents and links to all documentation sections.
 *
 * @param preparedFiles - An array of prepared files.
 * @param options - Options for generating the `llms.txt` file.
 * @returns A string representing the content of the `llms.txt` file.
 *
 * @example
 * ```markdown
 * # Shadcn for Vue
 *
 * > Beautifully designed components built with Radix Vue and Tailwind CSS.
 *
 * ## Table of Contents
 *
 * - [Getting started](/docs/getting-started.md)
 * - [About](/docs/about.md)
 * - ...
 * ```
 *
 * @see https://llmstxt.org/#format
 */
export async function generateLLMsTxt(
	preparedFiles: PreparedFile[],
	{
		indexMd,
		srcDir,
		LLMsTxtTemplate = defaultLLMsTxtTemplate,
		templateVariables = {},
		vitepressConfig,
		domain,
		sidebar,
		linksExtension,
		cleanUrls,
	}: GenerateLLMsTxtOptions,
): Promise<string> {
	// @ts-expect-error
	matter.clearCache()

	const indexMdContent = await fs.readFile(indexMd, 'utf-8')
	const indexMdFile = matter(indexMdContent)

	templateVariables.title ??=
		indexMdFile.data?.hero?.name ||
		indexMdFile.data?.title ||
		vitepressConfig?.title ||
		vitepressConfig?.titleTemplate ||
		extractTitle(indexMdFile) ||
		'LLMs Documentation'

	templateVariables.description ??=
		indexMdFile.data?.hero?.text ||
		vitepressConfig?.description ||
		indexMdFile?.data?.description ||
		indexMdFile.data?.titleTemplate

	if (templateVariables.description) {
		templateVariables.description = `> ${templateVariables.description}`
	}

	templateVariables.details ??=
		indexMdFile.data?.hero?.tagline ||
		indexMdFile.data?.tagline ||
		(!templateVariables.description && 'This file contains links to all documentation sections.')

	templateVariables.toc ??= await generateTOC(preparedFiles, {
		srcDir,
		domain,
		sidebarConfig: sidebar || vitepressConfig?.themeConfig?.sidebar,
		linksExtension,
		cleanUrls,
	})

	return expandTemplate(LLMsTxtTemplate, templateVariables)
}

/**
 * Options for generating the `llms-full.txt` file.
 */
export interface GenerateLLMsFullTxtOptions {
	/** The source directory for the files. */
	srcDir: VitePressConfig['vitepress']['srcDir']

	/** The base domain for the generated links. */
	domain?: LlmstxtSettings['domain']

	/** The link extension for generated links. */
	linksExtension?: LinksExtension

	/** Whether to use clean URLs (without the extension). */
	cleanUrls?: VitePressConfig['cleanUrls']
}

/**
 * Generates a `llms-full.txt` file content with all documentation in one file.
 *
 * @param preparedFiles - An array of prepared files.
 * @param options - Options for generating the `llms-full.txt` file.
 * @returns A string representing the full content of the LLMs.txt file.
 */
export async function generateLLMsFullTxt(
	preparedFiles: PreparedFile[],
	options: GenerateLLMsFullTxtOptions,
) {
	const { srcDir, domain, linksExtension, cleanUrls } = options

	const fileContents = await Promise.all(
		preparedFiles.map(async (file) => {
			const relativePath = path.relative(srcDir, file.path)
			const metadata = await generateMetadata(file.file, {
				domain,
				filePath: relativePath,
				linksExtension,
				cleanUrls,
			})

			return matter.stringify(file.file.content, metadata)
		}),
	)

	return fileContents.join('\n---\n\n')
}
