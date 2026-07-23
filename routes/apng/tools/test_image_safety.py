"""Small regression checks for destructive APNG post-processing behavior."""
import importlib.util
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


HERE = Path(__file__).resolve().parent


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    chroma_key = load_module("chroma_key")
    red = chroma_key.chroma_key_frame(Image.new("RGBA", (100, 100), (255, 0, 0, 255)))
    assert np.all(np.array(red)[:, :, 3] == 255), "chroma key erased non-green pixels"

    gray_bleed = load_module("fix_gray_bleed")
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        opaque = temp / "opaque-gray.png"
        opaque_fixed = temp / "opaque-gray-fixed.png"
        Image.new("RGBA", (10, 10), (100, 100, 110, 255)).save(opaque)
        assert gray_bleed.fix_frame(str(opaque), opaque_fixed, 10, 192) == 0

        edge = np.zeros((7, 7, 4), dtype=np.uint8)
        edge[2:5, 2:5] = (100, 100, 110, 200)
        edge[3, 3, 3] = 255
        edge_path = temp / "edge.png"
        edge_fixed = temp / "edge-fixed.png"
        Image.fromarray(edge).save(edge_path)
        assert gray_bleed.fix_frame(str(edge_path), edge_fixed, 7, 192) == 8
        assert np.array(Image.open(edge_fixed).convert("RGBA"))[3, 3, 3] == 255

        frames = temp / "frames"
        frames.mkdir()
        Image.new("RGBA", (20, 20), (0, 0, 0, 255)).save(frames / "frame_001.png")
        result = subprocess.run(
            [sys.executable, str(HERE / "check_dark.py"), str(frames), "--ratio", "0"],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 1, "check_dark did not report a failing exit code"

    print("Image safety checks passed.")


if __name__ == "__main__":
    main()
