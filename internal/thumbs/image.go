package thumbs

import (
	"fmt"

	"github.com/disintegration/imaging"
)

const thumbWidth = 400

func generateImageThumb(srcPath, dstPath string) error {
	src, err := imaging.Open(srcPath, imaging.AutoOrientation(true))
	if err != nil {
		return fmt.Errorf("open image %s: %w", srcPath, err)
	}

	thumb := imaging.Resize(src, thumbWidth, 0, imaging.Lanczos)

	if err := imaging.Save(thumb, dstPath, imaging.JPEGQuality(85)); err != nil {
		return fmt.Errorf("save thumbnail: %w", err)
	}
	return nil
}
