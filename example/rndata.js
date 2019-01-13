function getRandomData() {

    function getRandomDate(from, to) {
        from = from.getTime();
        to = to.getTime();
        return new Date(from + Math.random() * (to - from));
    }

    const count = 100
              
   const arr = [...Array(count).keys()].map(i => ({               
        group: 'group' + Math.floor(Math.random() * 10),
        label: 'label' + Math.floor(Math.random() * 10),
        description: 'Activity' + i,
        start: getRandomDate(new Date("2019-01-01"),new Date("2021-01-01")),
        finish: getRandomDate(new Date("2019-01-01"), new Date("2021-01-01"))

      }))

   for (var t = 0; t < arr.length; t++) {
              arr[t].start = new Date(arr[t].start)
              arr[t].finish = new Date(arr[t].start.getTime() + ((Math.floor(Math.random() * 100) + 10) * 24 * 60 * 60 * 1000))
              arr[t].start = dateFormat(arr[t].start, "yyyy-mm-dd")
              arr[t].finish  = dateFormat(arr[t].finish, "yyyy-mm-dd")
   }

        return arr
   
   }


