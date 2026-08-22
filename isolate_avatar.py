from rembg import remove
from PIL import Image

input_path = '264909.png'
output_path = 'assets/couple-avatar.png'

try:
    print("Loading image...")
    input_image = Image.open(input_path)
    
    # We can crop the image first roughly to avoid rembg getting confused by other elements (like flowers or text)
    # The avatar is generally in the middle top.
    width, height = input_image.size
    
    # We will crop the top middle section which usually contains the avatar to prevent text/flowers from being kept.
    # Typical invitation: top 10% is blank/floral, avatar is around 15% to 50% height.
    left = width * 0.1
    top = height * 0.1
    right = width * 0.9
    bottom = height * 0.6
    
    print("Cropping image to focus on couple...")
    cropped = input_image.crop((left, top, right, bottom))

    print("Removing background...")
    output_image = remove(cropped)
    
    print("Saving isolated avatar...")
    import os
    if not os.path.exists('assets'):
        os.makedirs('assets')
    output_image.save(output_path)
    print("Done!")
except Exception as e:
    print("Error:", e)
