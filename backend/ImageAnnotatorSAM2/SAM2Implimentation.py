import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
import torch
import numpy as np
from PIL import Image

from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

curr_dir = os.path.dirname(os.path.abspath(__file__))

SAM2_LARGE_CHECKPOINT_PATH = os.path.join(curr_dir, 'checkpoints', 'sam2.1_hiera_large.pt')
SAM2_LARGE_CONFIG_FILE = "/configs/sam2.1/sam2.1_hiera_l.yaml"

SAM2_BASE_PLUS_CHECKPOINT_PATH = os.path.join(curr_dir, 'checkpoints', 'sam2.1_hiera_base_plus.pt')
SAM2_BASE_PLUS_CONFIG_FILE = "/configs/sam2.1/sam2.1_hiera_b+.yaml"

SAM2_SMALL_CHECKPOINT_PATH = os.path.join(curr_dir, 'checkpoints', 'sam2.1_hiera_small.pt')
SAM2_SMALL_CONFIG_FILE = "/configs/sam2.1/sam2.1_hiera_s.yaml"

SAM2_TINY_CHECKPOINT_PATH = os.path.join(curr_dir, 'checkpoints', 'sam2.1_hiera_tiny.pt')
SAM2_TINY_CONFIG_FILE = "/configs/sam2.1/sam2.1_hiera_t.yaml"

if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")
print(f"using device: {device}")
if device.type == "cuda":
    # use bfloat16 for the entire notebook
    torch.autocast("cuda", dtype=torch.bfloat16).__enter__()
    # turn on tfloat32 for Ampere GPUs (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
    if torch.cuda.get_device_properties(0).major >= 8:
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
elif device.type == "mps":
    print(
        "\nSupport for MPS devices is preliminary. SAM 2 is trained with CUDA and might "
        "give numerically different outputs and sometimes degraded performance on MPS. "
        "See e.g. https://github.com/pytorch/pytorch/issues/84936 for a discussion."
    )

sam2_model_large = build_sam2(SAM2_LARGE_CONFIG_FILE, SAM2_LARGE_CHECKPOINT_PATH, device=device)
sam2_large = SAM2ImagePredictor(sam2_model_large) 

sam2_model_base_plus = build_sam2(SAM2_BASE_PLUS_CONFIG_FILE, SAM2_BASE_PLUS_CHECKPOINT_PATH, device=device)
sam2_base_plus = SAM2ImagePredictor(sam2_model_base_plus) 

sam2_model_small = build_sam2(SAM2_SMALL_CONFIG_FILE, SAM2_SMALL_CHECKPOINT_PATH, device=device)
sam2_small = SAM2ImagePredictor(sam2_model_small) 

sam2_model_tiny = build_sam2(SAM2_TINY_CONFIG_FILE, SAM2_TINY_CHECKPOINT_PATH, device=device)
sam2_tiny = SAM2ImagePredictor(sam2_model_tiny) 


class AutoSegmentTool:
    def __init__(self) -> None:

        ################################################################################
        return
        ################################################################################


    def hamish(self):
        print("horay")


    def generateMask(
            self,
            # PIL image object
            image: Image,
            # list of coords of form [x, y]
            inclusionPoints: list[list[float, float]] = [],
            # list of bounding boxes of form [x1, y1, x2, y2]
            boundingBoxes: list[list[float, float, float, float]] = [],
            # list of coords of form [x, y]
            exclusionPoints: list[list[float, float]] = [],
            # specifies the model checkpoint to use, where
            # 0 = tiny, 1 = small, 2 = base_plus, 3 = large
            model: int = 3
        ) -> list[list[int]]:
            
            sam2 = [sam2_tiny, sam2_small, sam2_base_plus, sam2_large][model]

            sam2.set_image(np.array(image.convert("RGB")))
            if inclusionPoints and boundingBoxes:
                print("WARNING: Inclusion points and bounding boxes are not meant to be used together. Using both can cause errors and unexpected behaviour.")
            
            point_labels = [1] * len(inclusionPoints) + [0] * len(exclusionPoints)
            # evaluates to first truthy value, or last value if none
            point_coords = inclusionPoints + exclusionPoints or None
            # evaluates to first truthy value, or last value if none
            box = boundingBoxes or None
            masks, _, _ = sam2.predict(
                point_labels=point_labels,
                point_coords=point_coords,
                box=box,
                multimask_output=False
            )
            return masks#.tolist()