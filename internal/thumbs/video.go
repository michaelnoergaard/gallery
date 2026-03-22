package thumbs

import (
	"fmt"
	"os"
	"os/exec"
)

func generateVideoThumb(srcPath, dstPath string) error {
	// Extract a frame at 1 second using FFmpeg
	cmd := exec.Command("ffmpeg",
		"-ss", "1",
		"-i", srcPath,
		"-vframes", "1",
		"-vf", fmt.Sprintf("scale=%d:-1", thumbWidth),
		"-q:v", "3",
		"-y",
		dstPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		os.Remove(dstPath)
		return fmt.Errorf("ffmpeg thumbnail: %w\noutput: %s", err, string(output))
	}

	// Verify the output file exists and has content
	info, err := os.Stat(dstPath)
	if err != nil || info.Size() == 0 {
		os.Remove(dstPath)
		return fmt.Errorf("ffmpeg produced empty thumbnail for %s", srcPath)
	}

	return nil
}
