.PHONY: transfer rebuild chrome firefox extension chrome-zip firefox-zip clean-extensions

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
	@rm -f dist/firefox.zip
	@cd dist && zip -r firefox.zip firefox/
	@echo "Created dist/firefox.zip"

clean-extensions:
	@rm -rf dist/chrome dist/firefox dist/chrome.zip dist/firefox.zip
	@echo "Cleaned extension build artifacts"
