<template >
    <div class="page">
        <!-- Nav Bar sa Guest Page -->
        <nav id = "guestNav">
            <div id ="Container1">
                <div id="Container2">
                    <img src="/public/Logo.png" alt="ResidEase" class="brandLogo">
                </div>  
                <span id = "description">ResidEase</span>
            </div>
            <div id = "buttonContainer1">
                <button id="button1" @click = "$router.push('/login')">Log In</button>
                <button id="button2" @click = "$router.push('/register')"><span>Signup</span></button>
            </div>

            <div id ="buttonContainer3">
                <button id="button5">Browse Rooms</button>
                <button id="button6">About</button>
                <button id="button7">Contact Us</button>
            </div>

        </nav>

        <!-- Container para sa Logo sa GuestPage -->
        <div id="designContainer" >
            <img src="/public/Design.png" alt="ResidEase" class="designGuestPage">
        </div>

        <!-- Div for the main headline sa page -->
        <div id = "description2Container">
            <h1 id="description2">
               Your Space,<br> Your Comfort
            </h1>
        </div>
 
        <div id= "description3Container">
            <h2 id="description3">
                Browse available rooms, check amenities, and inquire directly online.
            </h2>
        </div>

        <div id = "searchContainer">
            <div id = "searchBar">
                <span id="searchIcon">&#128269;</span>
                <div id = "searchDivider"></div>
                <select id="priceDropdown">
                    <option>Any price</option>
                    <option>₱1,000 - ₱3,000</option>
                    <option>₱3,000 - ₱5,000</option>
                    <option>₱5,000+</option>
                </select>
                <button id="searchButton">Search</button>
            </div>
        </div>

        <!-- For Filtering Searches -->
        <div id="filterContainer">
            <!-- Filtering the Types of Room -->
            <div class="filterGroup">
                <span class="filterLabel">Type:</span>
                    <button 
                        v-for="type in roomTypes" 
                        :key="type"
                        :class="['filterBtn', { active: selectedType === type }]"
                        @click="selectedType = type">
                        {{ type }}
                    </button>
                </div>


                <div class="filterGroup">
                    <span class="filterLabel">Status:</span>
                        <button 
                            v-for="status in roomStatus" 
                            :key="status"
                            :class="['filterBtn', { active: selectedStatus === status }]"
                            @click="selectedStatus = status">
                            {{ status }}
                </button>
                </div>

            </div>
        


        
        </div>
</template>

<script>
export default {
    data() {
        return {
            selectedType: 'All rooms',
            selectedStatus: 'Available',
            roomTypes: ['All rooms', 'Single', 'Double', 'Shared', 'Studio'],
            roomStatus: ['Available', 'All']
             }
          }

}
</script>


<!-- Editting the Guest Page itself -->
<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #faf7ff;
}
// Nav Container para sa mga Components
#guestNav{
    justify-content: space-between;
    display: flex;
    height: 120px;
}
// Page Container for Image and Description
#Container1{
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: -70px;
    margin-top: 20px;
    width: 500px;
}
// Container for Image
#Container2{
    display: flex;
    align-items: center;
}
// Container for Buttons
#buttonContainer1{
    display: flex;
    align-items: center;
    margin-right: 5px;
    margin-top: 20px;
    width: 450px;
    justify-content:center ;   
    gap: 50px;
}
#buttonContainer3{
    position: absolute;
    display: flex;
    justify-content:center;
    align-items: center;
    margin-left: 550px;
    margin-top: 35px;
    width: 600px;
    gap: 15px;
}

//Search Container
#searchContainer {
    display: flex;
    margin-left: 390px;
    margin-top: -70px;
    width: 750px;
}

#searchBar {
    display: flex;
    align-items: center;
    background: #1e2a3a;       
    border-radius: 50px;    
    padding: 10px 20px;
    width: 100%;
    gap: 12px;
}

#searchIcon {
    font-size: 18px;
    color: #9ca3af;
}

#searchDivider {
    width: 1px;
    height: 30px;
    background: #4b5563; 
}
#priceDropdown {
    flex: 1;                    
    background: #1e2a3a;
    border: none;
    color: white;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    appearance: none;    
    -webkit-appearance: none;
}

#priceDropdown::after {
    content: '▾';
    color: white;
}

#searchButton {
    background: transparent;
    border: 2px solid #4b5563;
    color: white;
    padding: 8px 20px;
    border-radius: 50px;   
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: white;
        color: #1e2a3a;
    }
}
// For Filtering Searches
#filterContainer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 20px;
    margin-left: 320px;
    margin-top: 15px;
    background: #1e2a3a;
    padding: 10px 30px;
    border-radius: 50px;
    width: 900px;
}

.filterGroup {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 18px;
}
.filterGroup:last-child {
    margin-left: 40px; 
}
.filterLabel {
    color: #9ca3af;
    font-size: 15px;
    font-weight: 600;   
    margin-right: 5px;
}
.filterBtn {
    background: transparent;
    border: 1.5px solid #4b5563;
    color: white;
    padding: 6px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: #ae68fa;
        color: #ae68fa;
    }

    &.active {
        background: #ae68fa;  // 👈 highlighted when selected
        border-color: #ae68fa;
        color: white;
    }
}


// Button Lay Out
#button1{
  display:flex; 
  align-items:center;
  justify-content: center; 
  width: 130px;
  height: 50px;
  gap:6px;
  padding:8px 16px; 
  border-radius:10px; 
  border:none;
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  font-size: 17px; 
  font-weight:600; cursor:pointer;
  color: white;
  transition:background .15s;
}
#button2 {
  display: flex; 
  align-items: center;
  justify-content: center; 
  width: 130px;
  height: 50px;
  padding: 8px 16px; 
  border-radius: 10px; 
  border: 2px solid transparent;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(90deg, #ae68fa, #f1966e) border-box;
  font-size: 17px; 
  font-weight: 600;
  cursor: pointer;
}

#button2 span {
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
#button4 span {
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
#button5{
  display:flex; 
  align-items:center;
  justify-content: center; 
  width: 200px;
  height: 70px;
  padding:8px 16px; 
  background: transparent;
  border:transparent;
  font-size:20px;  
  font-weight:700;  
  cursor:pointer;
  color:#6b7280;
  transition:background .15s;
}
#button6{
display:flex; 
  align-items:center;
  justify-content: center; 
  width: 120px;
  height: 60px;
  padding:8px 16px; 
  background: transparent;
  border:transparent;
  font-size:20px;  
  font-weight:700;   
  cursor:pointer;
   color:#6b7280;
  transition:background .15s;
}
#button7{
display:flex; 
align-items:center;
justify-content: center; 
width: 200px;
height: 60px;
padding:8px 16px; 
border: transparent;
background: transparent;
font-size:20px;  
font-weight:700;
cursor:pointer;
 color:#6b7280;
}

// Image Size
.brandLogo{
  width:55px; 
  height:45px; 
}

// Font for Description
#description{
    font-size: 20px;
    font-weight: 700; 
    color:#6b7280;
}

#description2Container{
    display: flex;
    justify-content: center;
    align-items: center;
    height: 400px;
    width: 650px;
    margin-left: 450px;
    margin-top: -70px;
}
#description3Container{
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    width: 750px;
    margin-left: 390px;
    margin-top: -190px;
}
#designContainer{
    position: absolute; 
    top: -100px;       
    left:-20px;
    display: flex;
    align-items: center;
    width: 500px;
    height: 600px;
}
#description2{
    font-size: 75px;
    font-weight: 700;
    line-height: 80px;
    background: linear-gradient(90deg, #ae68fa, #f1966e);
     -webkit-background-clip: text;
     background-clip: text;
     color: transparent;
}
#description3{
    font-size: 19px;
    font-weight: 500;
    font-style: oblique;
    align-items: center;
    justify-content: center;
    color: #9DB2BF ;

}
.designGuestPage{
    width:400px; 
    height:300px; 
}


#backgroundImage{
    position: absolute;
    align-items: center;
    justify-content: center;
    top: 100px;       
    left: 850px;
    display: flex;
    width: 600px;
    height: 500px;
}

.background{
    display: flex;
    width:600px; 
    height:500px; 
}


</style>