function getRandomData() {

    function getRandomDate(from, to) {
        from = from.getTime();
        to = to.getTime();
        return new Date(from + Math.random() * (to - from));
    }

    const count = 100
              
    return [...Array(count).keys()].map(i => ({               
        group: 'group' + Math.floor(Math.random() * 10),
        label: 'label' + Math.floor(Math.random() * 10),
        description: 'Activity' + i,
        start: getRandomDate(new Date("2019-01-01"),new Date("2021-01-01")),
        finish:getRandomDate(new Date("2019-01-01"),new Date("2021-01-01"))

    }))
    }


