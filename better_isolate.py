from rembg import remove, new_session
from PIL import Image

input_path = '264909.png'
output_path = 'assets/couple-avatar.png'

try:
    print('Loading image...')
    input_image = Image.open(input_path)
    
    # We will use u2net_human_seg to perfectly isolate the humans.
    print('Initializing u2net_human_seg session...')
    session = new_session('u2net_human_seg')
    
    print('Removing background...')
    # Pass the full image to get the humans out
    isolated = remove(input_image, session=session)
    
    # Now we find the bounding box of the non-transparent pixels to crop it tightly
    bbox = isolated.getbbox()
    if bbox:
        print('Cropping to bounding box:', bbox)
        isolated = isolated.crop(bbox)
        
    print('Saving high-res avatar...')
    isolated.save(output_path)
    print('Done!')
except Exception as e:
    print('Error:', e)
