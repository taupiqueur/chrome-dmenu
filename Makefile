# General options
name = chrome-dmenu
version = $(shell git describe --tags --always)

all: assets/dmenu-logo@16px.png assets/dmenu-logo@32px.png assets/dmenu-logo@48px.png assets/dmenu-logo@128px.png

assets/dmenu-logo@16px.png: assets/dmenu-logo.svg
	inkscape $< -o $@ -w 16 -h 16

assets/dmenu-logo@32px.png: assets/dmenu-logo.svg
	inkscape $< -o $@ -w 32 -h 32

assets/dmenu-logo@48px.png: assets/dmenu-logo.svg
	inkscape $< -o $@ -w 48 -h 48

assets/dmenu-logo@128px.png: assets/dmenu-logo.svg
	inkscape $< -o $@ -w 128 -h 128

build: all
	npm install

release: clean build
	7z a releases/$(name)-$(version).zip manifest.json src assets ./@types

clean:
	git clean -d -f -X
