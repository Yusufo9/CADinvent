package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestStaticServer(t *testing.T) {
	root := fstest.MapFS{"index.html": {Data: []byte("<h1>CADinvent</h1>")}, "assets/worker.js": {Data: []byte("self.onmessage = () => {}")}}
	handler := appHandler(root, "127.0.0.1:47831")
	for _, tc := range []struct {
		name, method, host, path string
		status                   int
	}{
		{"homepage", "GET", "127.0.0.1:47831", "/", 200},
		{"head", "HEAD", "127.0.0.1:47831", "/", 200},
		{"worker", "GET", "127.0.0.1:47831", "/assets/worker.js", 200},
		{"missing", "GET", "127.0.0.1:47831", "/missing.js", 404},
		{"directory", "GET", "127.0.0.1:47831", "/assets/", 404},
		{"traversal", "GET", "127.0.0.1:47831", "/../go.mod", 404},
		{"rebind", "GET", "attacker.example", "/", 403},
		{"no uploads", "POST", "127.0.0.1:47831", "/", 405},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(tc.method, "http://"+tc.host+tc.path, nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)
			if w.Code != tc.status {
				t.Fatalf("got %d, want %d", w.Code, tc.status)
			}
			if tc.name == "worker" && !strings.Contains(w.Header().Get("Content-Type"), "javascript") {
				t.Fatal("worker must have JavaScript MIME type")
			}
			if tc.name == "homepage" && !strings.Contains(w.Body.String(), "CADinvent") {
				t.Fatal("homepage body missing")
			}
			if tc.name == "head" && w.Body.Len() != 0 {
				t.Fatal("HEAD must not send a body")
			}
		})
	}
}

func TestExistingInstance(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(serverID)) }))
	defer server.Close()
	if !runningInstance(server.URL) {
		t.Fatal("did not recognize existing CADinvent server")
	}
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("another app")) }))
	defer other.Close()
	if runningInstance(other.URL) {
		t.Fatal("must not mistake another server for CADinvent")
	}
}
