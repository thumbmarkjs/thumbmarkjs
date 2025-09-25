include .env
VERSION := $(shell jq -r '.version' package.json)

bld:
	rm -rf dist/*
	npm run build
	rm -rf dist/types
	cp dist/thumbmark.umd.js testpage/thumbmark.umd.js