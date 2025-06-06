import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { ViteDevServer } from 'vite'
import type { Plugin } from 'vitepress'
import { mockedFs } from './mocks/fs'
import { fakeMarkdownDocument, srcDir, preparedFilesDepthSample } from './resources'

mock.module('node:fs/promises', () => mockedFs)
const { access, mkdir, writeFile } = mockedFs.default

// Mock the logger to prevent output
mock.module('../src/helpers/logger', () => ({
	default: {
		info: mock(),
		success: mock(),
		warn: mock(),
		error: mock(),
	},
}))

import path from 'node:path'
// Import the module under test AFTER mocking its dependencies
// @ts-ignore
import llmstxt from '../src/index'
import type { VitePressConfig } from '../src/types'

describe('llmstxt plugin', () => {
	let plugin: [Plugin, Plugin]
	let mockConfig: VitePressConfig
	let mockServer: ViteDevServer

	beforeEach(() => {
		// Reset mock call counts
		mkdir.mockReset()
		writeFile.mockReset()

		// Setup mock config
		mockConfig = {
			vitepress: {
				outDir: 'dist',
				srcDir: 'docs',
			},
			build: {
				ssr: false,
			},
		} as VitePressConfig

		// Setup mock server
		mockServer = {
			middlewares: {
				use: mock(),
			},
		} as unknown as ViteDevServer

		// Initialize plugin
		plugin = llmstxt()
	})

	describe('configureServer', () => {
		it('should configure server middleware', () => {
			// @ts-ignore
			plugin[1].configureServer(mockServer)
			const spyMiddlewaresUse = spyOn(mockServer.middlewares, 'use')
			expect(spyMiddlewaresUse).toHaveBeenCalled()
		})
	})

	describe('transform', () => {
		it('should collect markdown files', async () => {
			// @ts-ignore
			const result = await plugin[0].transform(fakeMarkdownDocument, 'docs/test.md')
			expect(result).toBeNull()
		})

		it('should not collect non-markdown files', async () => {
			// @ts-ignore
			const result = await plugin[0].transform(fakeMarkdownDocument, 'docs/test.ts')
			expect(result).toBeNull()
		})
	})

	describe('generateBundle', () => {
		it('should skip processing in SSR build', () => {
			const ssrConfig = { ...mockConfig, build: { ssr: true } }
			// @ts-ignore
			plugin[1].configResolved(ssrConfig)
			// @ts-ignore
			plugin[1].generateBundle()
			expect(writeFile).not.toHaveBeenCalled()
		})

		it('should create output directory if it does not exist', async () => {
			access.mockImplementationOnce(async () => {
				throw new Error()
			})

			// @ts-ignore
			plugin[1].configResolved(mockConfig)
			// @ts-ignore
			await plugin[1].generateBundle()

			expect(mkdir).toHaveBeenCalledWith('dist', { recursive: true })
		})

		it('should process markdown files and generate output files', async () => {
			plugin = llmstxt({ generateLLMsFullTxt: false, generateLLMsTxt: false })
			// @ts-ignore
			plugin[1].configResolved(mockConfig)
			await Promise.all([
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/test.md'),
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/test/test.md'),
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/guide/index.md'),
			])
			// @ts-ignore
			await plugin[1].generateBundle()

			// Verify that files were written
			expect(writeFile).toHaveBeenCalledTimes(3)
			expect(writeFile).nthCalledWith(
				1,
				path.resolve(mockConfig.vitepress.outDir, 'test.md'),
				'---\nurl: /test.md\n---\n# Some cool stuff\n',
			)
			expect(writeFile).nthCalledWith(
				2,
				path.resolve(mockConfig.vitepress.outDir, 'test', 'test.md'),
				'---\nurl: /test/test.md\n---\n# Some cool stuff\n',
			)
			expect(writeFile).nthCalledWith(
				3,
				path.resolve(mockConfig.vitepress.outDir, 'guide.md'),
				'---\nurl: /guide.md\n---\n# Some cool stuff\n',
			)
		})

		it('should ignore files specified in ignoreFiles option', async () => {
			plugin = llmstxt({
				generateLLMsFullTxt: false,
				generateLLMsTxt: false,
				ignoreFiles: ['test/*.md'],
			})
			// @ts-ignore
			plugin[1].configResolved(mockConfig)
			await Promise.all([
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/test.md'),
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/test/test.md'),
			])
			// @ts-ignore
			await plugin[1].generateBundle()

			// Verify that only non-ignored files were written
			expect(writeFile).toHaveBeenCalledTimes(1)
			expect(writeFile).toBeCalledWith(
				// docs/test.md
				path.resolve(mockConfig.vitepress.outDir, 'test.md'),
				'---\nurl: /test.md\n---\n# Some cool stuff\n',
			)
		})

		it('does not add links with `.md` extension in `llms.txt` if `generateLLMFriendlyDocsForEachPage` option is disabled', async () => {
			plugin = llmstxt({
				generateLLMsFullTxt: false,
				generateLLMFriendlyDocsForEachPage: false,
			})
			// @ts-ignore
			plugin[1].configResolved(mockConfig)
			await Promise.all([
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/test.md'),
			])
			// @ts-ignore
			await plugin[1].generateBundle()

			expect(writeFile).toHaveBeenCalledTimes(1)
			expect(writeFile.mock?.lastCall?.[1]).toMatchSnapshot()
		})

		it('does not add links with `.md` extension in `llms-full.txt` if `generateLLMFriendlyDocsForEachPage` option is disabled', async () => {
			plugin = llmstxt({
				generateLLMsTxt: false,
				generateLLMFriendlyDocsForEachPage: false,
			})
			// @ts-ignore
			plugin[1].configResolved(mockConfig)
			await Promise.all([
				// @ts-ignore
				plugin[0].transform(fakeMarkdownDocument, 'docs/test.md'),
			])
			// @ts-ignore
			await plugin[1].generateBundle()

			expect(writeFile).toHaveBeenCalledTimes(1)
			expect(writeFile.mock?.lastCall?.[1]).toMatchSnapshot()
		})

		it('generates depth-based llms.txt files', async () => {
			const files = preparedFilesDepthSample({ srcDir })

			plugin = llmstxt({
				generateLLMsTxt: true,
				generateLLMsFullTxt: false,
				generateLLMFriendlyDocsForEachPage: false,
				depth: 2,
				minFilesPerChunk: 2,
				includeNavigation: true,
			})

			// @ts-ignore
			plugin[1].configResolved(mockConfig)

			// Mock file reading with specific content for index.md
			const { readFile } = mockedFs.default
			readFile.mockResolvedValue(`---
title: Test Documentation
description: Test description for docs
---

# Test Documentation

This is the main documentation.`)

			// Setup mock transform results
			for (const file of files) {
				// @ts-ignore
				await plugin[0].transform(file.file.orig || fakeMarkdownDocument, file.path)
			}

			// @ts-ignore
			await plugin[1].generateBundle()

			// Should generate multiple llms.txt files based on depth
			const writtenFiles = writeFile.mock.calls
			const llmsTxtFiles = writtenFiles.filter(([path]) => path.endsWith('llms.txt'))

			expect(llmsTxtFiles.length).toBeGreaterThan(1)

			// Should have root llms.txt
			const rootLlms = llmsTxtFiles.find(([path]) => path.endsWith('/llms.txt'))
			expect(rootLlms).toBeDefined()

			// Should have directory-specific llms.txt files
			const guideLlms = llmsTxtFiles.find(([path]) => path.includes('guide/llms.txt'))
			const apiLlms = llmsTxtFiles.find(([path]) => path.includes('api/llms.txt'))

			expect(guideLlms).toBeDefined()
			expect(apiLlms).toBeDefined()

			// Verify files were created in correct directories (simplified test)
			expect(guideLlms![0]).toContain('guide/llms.txt')
			expect(apiLlms![0]).toContain('api/llms.txt')

			// Verify content structure exists
			const guideContent = guideLlms?.[1] as string
			expect(guideContent.length).toBeGreaterThan(0)
		})

		it('respects depth setting of 1 (root only)', async () => {
			const files = preparedFilesDepthSample({ srcDir })

			plugin = llmstxt({
				generateLLMsTxt: true,
				generateLLMsFullTxt: false,
				generateLLMFriendlyDocsForEachPage: false,
				depth: 1, // Only root
				minFilesPerChunk: 2,
			})

			// @ts-ignore
			plugin[1].configResolved(mockConfig)

			// Setup mock transform results
			for (const file of files) {
				// @ts-ignore
				await plugin[0].transform(file.file.orig || fakeMarkdownDocument, file.path)
			}

			// @ts-ignore
			await plugin[1].generateBundle()

			// Should only generate root llms.txt
			const writtenFiles = writeFile.mock.calls
			const llmsTxtFiles = writtenFiles.filter(([path]) => path.endsWith('llms.txt'))

			expect(llmsTxtFiles).toHaveLength(1)
			expect(llmsTxtFiles[0][0]).toMatch(/\/llms\.txt$/)
		})

		it('respects minFilesPerChunk setting', async () => {
			const files = preparedFilesDepthSample({ srcDir })

			plugin = llmstxt({
				generateLLMsTxt: true,
				generateLLMsFullTxt: false,
				generateLLMFriendlyDocsForEachPage: false,
				depth: 3,
				minFilesPerChunk: 5, // High threshold
			})

			// @ts-ignore
			plugin[1].configResolved(mockConfig)

			// Setup mock transform results
			for (const file of files) {
				// @ts-ignore
				await plugin[0].transform(file.file.orig || fakeMarkdownDocument, file.path)
			}

			// @ts-ignore
			await plugin[1].generateBundle()

			// Should generate fewer files due to high minFilesPerChunk
			const writtenFiles = writeFile.mock.calls
			const llmsTxtFiles = writtenFiles.filter(([path]) => path.endsWith('llms.txt'))

			// Should have at least root, but fewer subdirectory files
			expect(llmsTxtFiles.length).toBeGreaterThanOrEqual(1)
			expect(llmsTxtFiles.length).toBeLessThan(6) // Less than total possible directories
		})
	})
})
