// CADinvent serves its embedded static application in the user's own browser.
// It never receives CAD files: imports and persistence happen in the browser.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// The build script generates the embedded asset initializer in build/launcher.
// Keeping generated assets outside portable/ leaves this directory source-only.
var assets fs.FS

var version = "dev"

const serverID = "CADinvent portable server v1"

func main() {
	port := flag.Int("port", 47831, "Local port; keep this unchanged to retain the same browser library")
	browser := flag.String("browser", "default", "Browser: default, firefox, or none")
	showVersion := flag.Bool("version", false, "Print the application version")
	flag.Parse()
	if *showVersion {
		fmt.Println("CADinvent", version)
		return
	}
	if assets == nil {
		log.Fatal("No embedded application. Build with pnpm build and pnpm portable:build from the project root.")
	}
	if *port < 1 || *port > 65535 {
		log.Fatal("Port must be between 1 and 65535.")
	}
	if *browser != "default" && *browser != "firefox" && *browser != "none" {
		log.Fatal("Browser must be default, firefox, or none.")
	}
	address := net.JoinHostPort("127.0.0.1", strconv.Itoa(*port))
	url := "http://" + address
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		if runningInstance(url) {
			fmt.Println("CADinvent is already running at", url)
			if err := openBrowser(*browser, url); err != nil {
				log.Print(err)
			}
			return
		}
		log.Fatalf("Cannot listen on %s: %v. Close the conflicting app or use -port with another port (a different port has a separate library).", address, err)
	}
	root, err := fs.Sub(assets, "public")
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Handler: appHandler(root, address), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	fmt.Printf("CADinvent %s\n\nOpen: %s\nLocal only. No file uploads, account, or internet connection required.\nKeep this window open. Press Ctrl+C or close it to stop.\n\n", version, url)
	go func() {
		if err := openBrowser(*browser, url); err != nil {
			log.Printf("Could not open the browser: %v. Open %s manually.", err, url)
		}
	}()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func appHandler(root fs.FS, address string) http.Handler {
	// Windows MIME registries vary; worker modules must always have a JS MIME type.
	_ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".css", "text/css; charset=utf-8")
	files := http.FileServer(http.FS(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != address {
			http.Error(w, "Local access only", http.StatusForbidden)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
		w.Header().Set("Cache-Control", "no-cache")
		if r.URL.Path == "/healthz" {
			w.Header().Set("Content-Type", "text/plain")
			_, _ = io.WriteString(w, serverID)
			return
		}
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" {
			name = "index.html"
		}
		info, err := fs.Stat(root, name)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		files.ServeHTTP(w, r)
	})
}

func runningInstance(url string) bool {
	client := &http.Client{Timeout: time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
	response, err := client.Get(url + "/healthz")
	if err != nil {
		return false
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 128))
	return err == nil && response.StatusCode == http.StatusOK && string(body) == serverID
}

func openBrowser(browser, url string) error {
	if browser == "none" {
		return nil
	}
	var command *exec.Cmd
	if browser == "firefox" {
		if runtime.GOOS == "darwin" {
			command = exec.Command("open", "-a", "Firefox", url)
		} else {
			firefox, err := exec.LookPath("firefox")
			if err != nil && runtime.GOOS == "windows" {
				for _, base := range []string{os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("LOCALAPPDATA")} {
					candidate := filepath.Join(base, "Mozilla Firefox", "firefox.exe")
					if _, statErr := os.Stat(candidate); statErr == nil {
						firefox = candidate
						err = nil
						break
					}
				}
			}
			if err != nil {
				return fmt.Errorf("Firefox is not installed or not on PATH: %w", err)
			}
			command = exec.Command(firefox, "-new-tab", url)
		}
	} else {
		switch runtime.GOOS {
		case "windows":
			command = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
		case "darwin":
			command = exec.Command("open", url)
		default:
			command = exec.Command("xdg-open", url)
		}
	}
	if err := command.Start(); err != nil {
		return err
	}
	go func() { _ = command.Wait() }()
	return nil
}
