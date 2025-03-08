export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export const formatScore = (score) => {
    return Number(score).toFixed(2);
};

export const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}; 