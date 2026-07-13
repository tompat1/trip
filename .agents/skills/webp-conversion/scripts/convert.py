import os
import sys
import subprocess
from pathlib import Path
import argparse

def install_pillow():
    try:
        import PIL
    except ImportError:
        print("Pillow library not found. Installing Pillow...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])

# Ensure Pillow is installed before importing
install_pillow()

from PIL import Image

def convert_to_webp(directory, replace=False):
    path = Path(directory)
    if not path.is_dir():
        print(f"Error: Directory '{directory}' does not exist.")
        sys.exit(1)

    image_exts = {'.png', '.jpg', '.jpeg'}
    converted_count = 0

    for filepath in path.rglob('*'):
        if filepath.suffix.lower() in image_exts:
            output_filepath = filepath.with_suffix('.webp')
            
            try:
                with Image.open(filepath) as img:
                    # If image is palette-based, convert to RGBA first to preserve transparency
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    
                    print(f"Converting {filepath.name} to {output_filepath.name}...")
                    img.save(output_filepath, 'webp', quality=85)
                
                converted_count += 1
                
                if replace:
                    filepath.unlink()
                    print(f"Removed original {filepath.name}")
                    
            except Exception as e:
                print(f"Failed to convert {filepath.name}: {e}")

    print(f"\nDone! Converted {converted_count} images to WebP.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert images to WebP format.')
    parser.add_argument('directory', type=str, help='Directory containing images to convert')
    parser.add_argument('--replace', action='store_true', help='Replace the original files (delete them after conversion)')
    
    args = parser.parse_args()
    convert_to_webp(args.directory, args.replace)
