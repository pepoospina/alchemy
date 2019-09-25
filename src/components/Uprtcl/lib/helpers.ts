export const shortId = (input: string) => {
    return `${input.substr(0,5)}...${input.slice(-5)}`
}

export const isOwnerOfPerspective = (origin: string, owner: string, userId: string) => {
    let isEthCheck = new RegExp('^eth://');
    let isEth = isEthCheck.test(origin);
    let canEdit = !isEth || (userId === owner);
    return canEdit;
}