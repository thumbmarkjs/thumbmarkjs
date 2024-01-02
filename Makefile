include .env
VERSION := $(shell jq -r '.version' package.json)

publish:
	aws s3 cp ./build/Thumbmark.js $(CDN_BUCKET)/thumbmark/$(VERSION)/Thumbmark.js --profile $(AWS_PROFILE)

latest:
	make publish
	aws s3 cp ./build/Thumbmark.js $(CDN_BUCKET)/thumbmark/latest/Thumbmark.js --profile $(AWS_PROFILE)

testpage:
	aws s3 sync ./testpage $(TESTPAGE_BUCKET) --profile $(AWS_PROFILE)

invalidate:
	aws cloudfront create-invalidation --distribution-id $(CDN_DISTRIBUTION) --paths "/latest/Thumbmark.js" --profile $(AWS_PROFILE)

testpage-invalidate:
	aws cloudfront create-invalidation --distribution-id $(TESTPAGE_DISTRIBUTION) --paths "/*" --profile $(AWS_PROFILE)