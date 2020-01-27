// ==UserScript==
// @name         enhanced-sier
// @namespace    k00lagin.enhanced-sier
// @updateURL    https://raw.githubusercontent.com/k00lagin/enhanced-sier/master/main.js
// @version      0.0.5
// @description  Make SIER great again!
// @author       Vsevolod Kulagin <k00lagin>
// @match        http://172.153.153.48/ais/*
// @grant        GM_addStyle
// ==/UserScript==
(function () {
  'use strict';

  let ES = {
    aliases: {
      719747: 'прописка',
      723392: 'права',
      727489: 'снилс'
    }
  };
  const React = {
    events: {
      onKeyUp: 'keyup',
      onClick: 'click'
    },
    createElement: function (tag, attrs, children) {
      var element = document.createElement(tag);

      for (let name in attrs) {
        if (name && attrs.hasOwnProperty(name)) {
          let value = attrs[name];

          if (name === 'className') {
            element.className = value.toString();
          } else if (this.events.hasOwnProperty(name)) {
            element.addEventListener(this.events[name], value);
          } else if (value === true) {
            element.setAttribute(name, name);
          } else if (value !== false && value != null) {
            element.setAttribute(name, value.toString());
          }
        }
      }

      for (let i = 2; i < arguments.length; i++) {
        let child = arguments[i];
        element.appendChild(child.nodeType == null ? document.createTextNode(child.toString()) : child);
      }

      return element;
    }
  };

  function checkLoadState() {
    if (!document.querySelector('.navigation.navigation-main')) {
      return;
    } else {
      init();
    }
  }

  async function getServiceList() {
    window.serviceList = [];
    let response = await fetch('http://172.153.153.48/api/v1/search/subservices', {
      method: 'POST',
      headers: {
        Accept: 'application/hal+json',
        Authorization: 'Bearer ' + localStorage.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'search': {
          'search': [{
            'field': 'units.id',
            'operator': 'eq',
            'value': '58bd51815744bf06e001b57b'
          }]
        },
        'size': 200,
        'sort': 'serviceCode,DESC',
        'prj': 'servicesList'
      })
    });

    if (response.ok) {
      let subservices = await response.json();
      subservices = subservices.content;
      subservices.forEach(subservice => {
        let service = {
          id: subservice._id,
          sid: subservice.serviceId.split('_')[3],
          name: subservice.serviceName
        };
        window.serviceList.push(service);
      });
    } else {
      console.warn('Ошибка HTTP: ' + response.status);
    }
  }

  function getFilteredList(string) {
    let words = string.split(' ');
    let filteredList = serviceList.filter(service => {
      return words.every(word => {
        if (ES.aliases[service.sid] && ES.aliases[service.sid].indexOf(word) !== -1) {
          return true;
        }

        if (service.sid.indexOf(word) !== -1) {
          return true;
        }

        if (service.name.indexOf(word) !== -1) {
          return true;
        }
      });
    });
    return filteredList;
  }

  function plantServiceSearchTrigger() {
    let serviceSearchTrigger = React.createElement("button", {
      className: "service-search-trigger icon-magic-wand",
      onClick: openServiceSearchDialog
    });
    let navigationContainer = document.querySelector('.navigation.navigation-main');
    navigationContainer.appendChild(serviceSearchTrigger);
  }

  function checkSearchTrigger() {
    if (!document.querySelector('.navigation.navigation-main .service-search-trigger')) {
      plantServiceSearchTrigger();
    }
  }

  function init() {
    getServiceList();
    plantServiceSearchTrigger();
    clearInterval(initInterval);
    ES.fixSearchTriggerInterval = setInterval(checkSearchTrigger, 500);
    createServiceSearchDialog();
    document.body.addEventListener('keyup', handleESKeyup);
    GM_addStyle(`.navigation.navigation-main {
	display: flex;
	flex-flow: column nowrap;
}

.service-search-trigger {
	order: -1;
	height: 40px;
	background-color: inherit;
	border: 0;
}

.service-search-dialog {
	width: 600px;
	height: calc(100% - 100px);
	position: fixed;
	top: 60px;
	z-index: 10;
	display: flex;
	flex-flow: column nowrap;
	padding: 13px 0 0 13px;
	border: 1px solid rgba(125, 125, 125, 0.2);
	box-shadow: 5px 0 5px -1px rgba(0,0,0,.2), 0 5px 5px -1px rgba(0,0,0,.2);
}

.dialog-header {
	display: flex;
	margin-bottom: 8px;
	font-family:Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;
	font-size:19px;
	font-weight:500;
}

.dialog-title {
	flex-grow: 1;
}

.dialog__close-trigger {
	margin-left: 8px;
	margin-right: 13px;
	background-color: transparent;
	border: 0;
}

.service-search-input {
	margin: 0 13px 8px 0;
	width: calc(100% - 13px);
}

.service-list-node {
	overflow-y: scroll;
	list-style: none;
	padding: 0;
	flex-grow: 1;
	margin: 0;
}

.service-code {
	margin-right: 8px;
}

.service-link:focus {
	text-decoration: underline;
}
`);
  }

  function createServiceSearchDialog() {
    let dialog = React.createElement("dialog", {
      className: "service-search-dialog hidden"
    }, React.createElement("header", {
      className: "dialog-header"
    }, React.createElement("span", {
      className: "dialog-title"
    }, "\u041D\u0430\u0447\u0430\u043B\u043E \u043D\u043E\u0432\u043E\u0433\u043E \u0434\u0435\u043B\u0430"), React.createElement("button", {
      className: "dialog__close-trigger icon-cross",
      onClick: closeServiceSearchDialog
    })), React.createElement("input", {
      className: "service-search-input form-control",
      type: "text",
      onKeyUp: handleSearchKeyup,
      placeholder: "Часть названия услуги, её код, или псевдоним..."
    }), React.createElement("ul", {
      className: "service-list-node"
    }));
    document.body.appendChild(dialog);
  }

  function updateServiceList() {
    let filteredList = [];
    let serviceListNode = document.querySelector('.service-list-node');

    if (document.querySelector('.service-search-input').value === '') {
      filteredList = serviceList;
    } else {
      filteredList = getFilteredList(document.querySelector('.service-search-input').value);
    }

    serviceListNode.innerHTML = '';
    filteredList.forEach(service => {
      let listItem = React.createElement("li", null, React.createElement("span", {
        className: "service-code"
      }, service.sid, " "), React.createElement("a", {
        className: "service-link",
        tabindex: "0",
        href: 'http://172.153.153.48/ais/appeals/create/' + service.id
      }, service.name));
      serviceListNode.appendChild(listItem);
    });
  }

  function openServiceSearchDialog() {
    document.querySelector('.service-search-input').value = '';
    updateServiceList();
    document.querySelector('.service-search-dialog').classList.remove('hidden');
    document.querySelector('.service-search-input').focus();
  }

  function closeServiceSearchDialog() {
    document.querySelector('.service-search-dialog').classList.add('hidden');
  }

  function handleSearchKeyup(e) {
    if (e.key === 'Enter' && document.querySelector('.service-search-dialog li:first-child > a')) {
      document.querySelector('.service-search-dialog li:first-child > a').click();
    } else {
      updateServiceList();
    }
  }

  function handleESKeyup(e) {
    if (e.key === 'Escape' && document.querySelector('.service-search-dialog:not(.hidden)')) {
      closeServiceSearchDialog();
    }
  }

  let initInterval = setInterval(checkLoadState, 100);
})();