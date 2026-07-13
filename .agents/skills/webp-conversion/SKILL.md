---
name: webp-conversion
description: Optimizes and converts project image assets (JPG, PNG) to WebP format to maintain a performant website.
---

# WebP Conversion Skill

Use this skill whenever the user asks to optimize images, convert assets to WebP, or when you notice unoptimized PNG/JPEG files in the project that should be converted for better web performance.

## Execution

This skill uses a Python script that leverages the `Pillow` library to batch convert images in a specified directory to WebP format.

### 1. Run the Conversion Script

When converting images, run the included script and pass the target directory as an argument:

```bash
python3 .agents/skills/webp-conversion/scripts/convert.py path/to/assets
```

By default, this will create `.webp` versions of all `.png`, `.jpg`, and `.jpeg` files in the directory without deleting the originals. 

### 2. Replacing Original Images

If the user wants to remove the original images and ONLY keep the `.webp` versions, you can pass the `--replace` flag:

```bash
python3 .agents/skills/webp-conversion/scripts/convert.py path/to/assets --replace
```

### 3. Updating References

After converting the images, ensure that you use your coding tools to update the source code (e.g., HTML, CSS, React components) to point to the new `.webp` extensions instead of `.png` or `.jpg`.
