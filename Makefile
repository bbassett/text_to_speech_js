include .env
.PHONY: transfer rebuild chrome firefox extension chrome-zip firefox-zip publish-firefox chrome-test test test-web test-extension test-firefox-lint clean-extensions

transfer:
	rsync -av \
	--exclude=.next \
	--exclude=.git \
	--exclude=node_modules \
	--exclude=.claude \
	--exclude=.entire \
	--exclude=.env.example \
	--exclude=docs \
	. brandon@hostserver:/home/brandon/projects/text_to_speech_js/. 

rebuild:
	docker compose down
	docker compose build
	docker compose up -d

# Extension build targets
EXT_SRC = src/extension
EXT_SHARED = background content lib icons

chrome: dist/chrome
firefox: dist/firefox
extension: chrome firefox

dist/chrome: $(shell find $(EXT_SRC) -type f)
	@rm -rf dist/chrome
	@mkdir -p dist/chrome
	@cp $(EXT_SRC)/manifest.chrome.json dist/chrome/manifest.json
	@for dir in $(EXT_SHARED); do \
		cp -r $(EXT_SRC)/$$dir dist/chrome/; \
	done
	@echo "Built dist/chrome/"

dist/firefox: $(shell find $(EXT_SRC) -type f)
	@rm -rf dist/firefox
	@mkdir -p dist/firefox
	@cp $(EXT_SRC)/manifest.firefox.json dist/firefox/manifest.json
	@for dir in $(EXT_SHARED); do \
		cp -r $(EXT_SRC)/$$dir dist/firefox/; \
	done
	@echo "Built dist/firefox/"

chrome-zip: chrome
	@rm -f dist/chrome.zip
	@cd dist && zip -r chrome.zip chrome/
	@echo "Created dist/chrome.zip"

firefox-zip: firefox
	@rm -f dist/tts-firefox.zip
	@cd dist/firefox && zip -r ../tts-firefox.zip .
	@echo "Created dist/tts-firefox.zip"

publish-firefox: firefox
	npx web-ext sign \
		--source-dir dist/firefox/ \
		--channel=listed \
		--amo-metadata=src/extension/amo-metadata.json \
		--api-key=$(MOZILLA_JWT_ISSUER) \
		--api-secret=$(MOZILLA_JWT_SECRET) \
		--ignore-files="lib/readability.js"

test: test-web test-extension test-firefox-lint

test-web:
	npx playwright test --project=web-chromium --project=web-firefox

test-extension: chrome-test
	npx playwright test --project=chrome-extension --workers=1

test-firefox-lint: firefox
	npx web-ext lint --source-dir dist/firefox/ --warnings-as-errors=false

chrome-test: chrome
	@rm -rf dist/chrome-test
	@cp -r dist/chrome dist/chrome-test
	@sed -i '' 's/mode: "closed"/mode: "open"/' dist/chrome-test/content/content.js
	@echo "Built dist/chrome-test/ (open shadow DOM)"

clean-extensions:
	@rm -rf dist/chrome dist/chrome-test dist/firefox dist/chrome.zip dist/tts-firefox.zip
	@echo "Cleaned extension build artifacts"
