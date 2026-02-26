transfer:
	rsync -av \
	--exclude=.next \
	--exclude=.git \
	--exclude=node_modules \
	--exclude=.claude \
	--exclude=.entire \
	--exclude=.env.example \
	. brandon@hostserver:/home/brandon/projects/text_to_speech_js/. 

rebuild:
	docker compose down
	docker compose build
	docker compose up -d

