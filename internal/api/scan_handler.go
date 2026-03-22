package api

import (
	"net/http"
)

// POST /api/scan - trigger a manual scan (admin only)
func (s *Server) handleTriggerScan(w http.ResponseWriter, r *http.Request) {
	if s.scanner == nil {
		writeError(w, http.StatusServiceUnavailable, "scanner not configured")
		return
	}

	status := s.scanner.Status()
	if status.Running {
		writeError(w, http.StatusConflict, "scan already in progress")
		return
	}

	go s.scanner.Scan()
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "scan started"})
}

// GET /api/scan/status - get scan progress
func (s *Server) handleScanStatus(w http.ResponseWriter, r *http.Request) {
	if s.scanner == nil {
		writeJSON(w, http.StatusOK, ScanStatus{})
		return
	}
	writeJSON(w, http.StatusOK, s.scanner.Status())
}
