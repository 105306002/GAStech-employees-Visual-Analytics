

## How to setup

1. Install python version 3.6. Other versions may not work well.
2. Download the gpswithstop.json file from the following link: https://drive.google.com/file/d/14CmC5MeDBifQiVAMeN6IDvdMPlXJikhw/view?usp=sharing
   <br/>
   Note: You need to login with your ASU account to download this file.
3. Place this file in the data directory of the project
4. Run following commands to install necessary python libraries:<br/>
   a. pip install flask<br/>
   b. pip install flask_cors<br>
   c. pip install pandas
5. Run the python backend server file placed in the backend folder first.<br>
   CMD: python backend/main.py <br>
   Note: the python server may take some time to load up the data based on the specs of your system.
6. Once the backed server is up, run the web server in the root of the project with the following command: <br>
   python -m http.server
7. Once this starts, you can access the project from http://localhost:8000/
