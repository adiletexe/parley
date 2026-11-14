import os,sys
from PIL import Image,ImageDraw,ImageFont
d=sys.argv[1];ims=[Image.open(os.path.join(d,f'v{i}.png')).convert('RGB') for i in range(1,6)]
W=1160;H=int(W*1080/1920);G=40;P=40;L=56
s=Image.new('RGB',(P*2+W*2+G,P*2+(H+L+G)*3),(228,225,218));dr=ImageDraw.Draw(s)
f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',40)
for i,im in enumerate(ims):
  x=P+(i%2)*(W+G);y=P+(i//2)*(H+L+G);dr.text((x,y),'ABCDE'[i],fill=(20,20,20),font=f);s.paste(im.resize((W,H),Image.LANCZOS),(x,y+L))
s.save(os.path.join(d,'sheet.png'));print(s.size)
