package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

var logFile *os.File

func initLogging() {
	dir, err := os.UserCacheDir()
	if err != nil || dir == "" {
		return
	}
	path := filepath.Join(dir, "0xDABmusic")
	if err := os.MkdirAll(path, 0755); err != nil {
		return
	}
	f, err := os.OpenFile(filepath.Join(path, "app.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return
	}
	logFile = f
	log.SetOutput(f)
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Printf("startup %s/%s", runtime.GOOS, runtime.GOARCH)
}

func main() {
	initLogging()
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic: %v", r)
		}
	}()

	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "0xDABmusic",
		Width:  1540,
		Height: 968,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Printf("Error: %v", err)
	}
}
