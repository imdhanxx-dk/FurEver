from pathlib import Path
import gc, subprocess, time

WIDTH, HEIGHT, FPS = 704, 384, 24
FULL_FRAMES, PREVIEW_FRAMES = 121, 49
MODEL_ID = "Lightricks/LTX-Video"
DISTILLED_FILENAME = "ltxv-2b-0.9.6-distilled-04-25.safetensors"

STYLE = (
    "premium fantasy game cinematic, painterly 2.5D animation with convincing depth, "
    "physically coherent feline anatomy, natural paw placement and feline joint motion, "
    "detailed soft fur, expressive ears and tail, volumetric lighting, stable subject identity, "
    "cinematic lensing, no text in frame"
)
NEGATIVE = (
    "deformed cat, extra legs, extra paws, fused limbs, detached limbs, human hands, broken anatomy, "
    "duplicated face, warped scarf, floating accessories, jitter, flicker, morphing, melting, blurry, watermark, text"
)

STORY = [
    (1,"lumi","The last bright morning","Lumi stands on a sunlit overlook above a radiant floating city. Golden motes drift around the small fluffy white celestial cat as the camera slowly dollies closer; the navy star-patterned scarf moves gently in the breeze."),
    (2,"lumi","The light falters","Lumi walks through Whispering Meadow. Golden motes blink out one after another and an unnatural shadow crosses the flowers. Lumi stops with one paw raised and looks upward, concerned. Low tracking camera at cat height."),
    (3,"lumi","The eclipse shard","Lumi finds a cracked violet-black crystal shard in the grass. Purple light reflects in the blue eyes. Lumi cautiously reaches toward it, then pulls back as nearby grass darkens. Slow circular camera move."),
    (4,"noctra","Something wakes","Noctra awakens among broken towers in the Celestial Ruins beneath a colossal purple eclipse. The massive black shadow cat raises the head and opens glowing violet eyes as smoky tendrils curl from the fur. Low-angle reveal."),
    (5,"noctra","The call of the shard","Close portrait of Noctra. The violet chest gem pulses three times. Noctra turns toward the horizon and steps from darkness with heavy but natural feline movement. Purple embers drift through shallow depth of field."),
    (6,"lumi","Run to Moonlit Woods","Lumi races along a narrow path into Moonlit Woods, filled with glowing mushrooms and silver leaves. The scarf streams behind without clipping. Paws land naturally. Fast stabilized chase camera at low height."),
    (7,"noctra","The shadow crosses","Noctra walks across a broken causeway high above a violet abyss. Each pawstep releases a quiet ripple of shadow. The eclipse forms a dramatic silhouette behind the cat while the camera cranes sideways."),
    (8,"lumi","A memory in the water","Lumi reaches a still moonlit pool. The water reflects the purple eclipse instead of the real sky, then briefly forms the lonely silhouette of a black cat before dissolving into rings. Slow overhead-to-close-up move."),
    (9,"lumi","The ruined gate","Lumi enters the Celestial Ruins through a gigantic archway. Golden light behind meets violet darkness ahead, splitting the floor into warm and cold halves. Lumi pauses, then continues. Symmetrical wide shot."),
    (10,"noctra","First sight","Noctra stands at the far end of a shattered bridge, tense rather than savage. Shoulders rise, tail wisps spread and the chest gem pulses with the eclipse. Slow telephoto push-in."),
    (11,"lumi","Lumi refuses to flee","Close-up of Lumi across the broken bridge. Wind pushes the starry scarf backward. Golden markings glow softly. Lumi takes one careful step forward instead of running, frightened but compassionate."),
    (12,"noctra","The shadow lashes out","Noctra releases a defensive wave of violet shadow ribbons across the bridge. The cat braces with all four paws naturally planted while fur moves with the force. Dynamic side angle and dramatic backlight."),
    (13,"lumi","Light without attack","Violet shadows surround Lumi, but Lumi does not attack. Golden markings bloom into a gentle sphere of light that bends the shadows around the body. Slow orbiting camera, gold and violet light mixing."),
    (14,"noctra","The fracture is revealed","Warm light reaches Noctra's chest gem. A thin gold crack appears through the violet gem and fragments of old starlight become visible within the smoky fur. Noctra looks down in shock, then softens."),
    (15,"lumi","A choice","Lumi slowly walks forward through fading shadow and extends one front paw toward the darkness beyond frame, offering trust. Blue eyes are calm with reflected gold and violet light. Camera moves from paw to face."),
    (16,"noctra","Noctra chooses","Noctra lowers the enormous head toward an unseen small paw. Shadow tendrils settle into soft smoke. The eyes reopen with a gentler violet glow and the eclipse sigil gains a thin golden rim."),
    (17,"lumi","A brighter tomorrow","At dawn, Lumi stands on a high ruin while gold and violet energy spiral into the sky and break apart the giant eclipse. A large peaceful shadow-cat silhouette stands beside Lumi slightly out of focus as the camera rises into an aerial reveal."),
]


def mount_project():
    from google.colab import drive
    drive.mount("/content/drive")
    root = Path("/content/drive/MyDrive/FurEver_Cinematic")
    refs, shots, final = root/"references", root/"shots", root/"final"
    for p in (refs, shots, final): p.mkdir(parents=True, exist_ok=True)
    return root, refs, shots, final


def upload_reference(refs, name):
    from google.colab import files
    import shutil
    target = refs/f"{name}.jpg"
    if target.exists():
        print("Already present:", target)
        return target
    print(f"Upload the {name.title()} reference image.")
    uploaded = files.upload()
    if len(uploaded) != 1: raise RuntimeError("Upload exactly one image.")
    src = Path(next(iter(uploaded)))
    shutil.move(str(src), str(target))
    return target


def prepare_refs(refs):
    from PIL import Image, ImageOps
    out = {}
    for name in ("lumi","noctra"):
        src, dst = refs/f"{name}.jpg", refs/f"{name}_704x384.jpg"
        im = Image.open(src).convert("RGB")
        ImageOps.fit(im,(WIDTH,HEIGHT),method=Image.Resampling.LANCZOS,centering=(0.5,0.46)).save(dst,quality=95)
        out[name] = dst
    return out


def load_pipeline():
    import torch
    from huggingface_hub import hf_hub_download
    from diffusers import AutoencoderKLLTXVideo, LTXImageToVideoPipeline, LTXVideoTransformer3DModel
    from transformers import T5EncoderModel, BitsAndBytesConfig

    if not torch.cuda.is_available():
        raise RuntimeError("Attach a Colab GPU first.")

    print("Loading 8-bit T5 text encoder...")
    q = BitsAndBytesConfig(load_in_8bit=True)
    text_encoder = T5EncoderModel.from_pretrained(
        MODEL_ID,
        subfolder="text_encoder",
        quantization_config=q,
        torch_dtype=torch.float16,
        device_map="auto",
    )

    # Download through huggingface_hub and pass a LOCAL file path to Diffusers.
    # Passing a /resolve/main/... URL to from_single_file() makes Diffusers prepend
    # another /resolve/main/ and produces the 404 seen in Colab.
    print("Locating/downloading LTX 2B distilled checkpoint...")
    distilled_ckpt = hf_hub_download(
        repo_id=MODEL_ID,
        filename=DISTILLED_FILENAME,
        repo_type="model",
        resume_download=True,
    )
    print("Checkpoint ready:", distilled_ckpt)

    print("Loading LTX 2B distilled transformer...")
    transformer = LTXVideoTransformer3DModel.from_single_file(
        distilled_ckpt,
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )

    print("Loading LTX video VAE...")
    vae = AutoencoderKLLTXVideo.from_single_file(
        distilled_ckpt,
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )

    print("Building image-to-video pipeline...")
    pipe = LTXImageToVideoPipeline.from_pretrained(
        MODEL_ID,
        text_encoder=text_encoder,
        transformer=transformer,
        vae=vae,
        torch_dtype=torch.float16,
        device_map="balanced",
    )
    if hasattr(pipe.vae,"enable_tiling"): pipe.vae.enable_tiling()
    if hasattr(pipe.vae,"enable_slicing"): pipe.vae.enable_slicing()
    pipe.set_progress_bar_config(disable=False)
    print("Ready on", torch.cuda.get_device_name(0))
    return pipe


def generate(pipe, refs_map, shots_dir, mode="full", steps=8, guidance=1.0):
    import torch
    from PIL import Image
    from diffusers.utils import export_to_video
    active = STORY[:2] if mode == "preview" else STORY
    frames_n = PREVIEW_FRAMES if mode == "preview" else FULL_FRAMES
    suffix = "preview" if mode == "preview" else "full"
    for i,(sid,char,title,prompt0) in enumerate(active,1):
        out = shots_dir/f"{sid:02d}_{suffix}.mp4"
        if out.exists() and out.stat().st_size > 100000:
            print(f"[{i}/{len(active)}] skip {out.name}")
            continue
        print(f"[{i}/{len(active)}] {sid:02d} {title}")
        started=time.time()
        ref=Image.open(refs_map[char]).convert("RGB")
        prompt=f"{prompt0} {STYLE}"
        gen=torch.Generator(device="cuda").manual_seed(8400+sid*137)
        frames=pipe(image=ref,prompt=prompt,negative_prompt=NEGATIVE,width=WIDTH,height=HEIGHT,num_frames=frames_n,frame_rate=FPS,num_inference_steps=steps,guidance_scale=guidance,decode_timestep=0.03,decode_noise_scale=0.025,generator=gen).frames[0]
        export_to_video(frames,str(out),fps=FPS)
        del frames; gc.collect(); torch.cuda.empty_cache()
        print(f"saved in {(time.time()-started)/60:.1f} min")


def assemble(root, shots_dir, final_dir):
    clips=[shots_dir/f"{sid:02d}_full.mp4" for sid,_,_,_ in STORY]
    missing=[p.name for p in clips if not p.exists()]
    if missing: raise RuntimeError("Missing full shots: "+", ".join(missing))
    norm=root/"normalized"; norm.mkdir(exist_ok=True)
    norm_clips=[]
    for p in clips:
        q=norm/p.name; norm_clips.append(q)
        if not (q.exists() and q.stat().st_size>100000):
            subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(p),"-an","-vf",f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=lanczos","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p",str(q)],check=True)
    lst=norm/"concat.txt"; lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in norm_clips))
    story=final_dir/"FurEver_Lumi_Noctra_story.mp4"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(lst),"-c","copy",str(story)],check=True)
    title=final_dir/"title_card.mp4"
    vf="drawtext=text='FurEver':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2-24,drawtext=text='A BRIGHTER TOMORROW, TOGETHER':fontcolor=white:fontsize=18:x=(w-text_w)/2:y=(h-text_h)/2+58"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-f","lavfi","-i",f"color=c=0x080713:s={WIDTH}x{HEIGHT}:d=4.3:r={FPS}","-vf",vf,"-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p",str(title)],check=True)
    final_list=final_dir/"final_concat.txt"; final_list.write_text(f"file '{story.as_posix()}'\nfile '{title.as_posix()}'\n")
    out=final_dir/"FurEver_Lumi_Noctra_90s_Cinematic.mp4"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(final_list),"-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-an",str(out)],check=True)
    print("Final:",out)
    return out
