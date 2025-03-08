export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return re.test(password);
};

export const validateScore = (score) => {
    const numScore = Number(score);
    return !isNaN(numScore) && numScore >= 0 && numScore <= 10;
};

export const validatePhoneNumber = (phone) => {
    const re = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    return re.test(phone);
}; 